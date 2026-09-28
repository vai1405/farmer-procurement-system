"""
Booking and token-generation business logic.

This is the most concurrency-sensitive module in the project. Read the
comments in create_booking() carefully — they explain exactly how
overbooking is prevented at the database level, per spec Section 8.
"""

import logging

from bson import ObjectId

from core.constants import BookingStatus, Collections, SlotStatus
from core.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from core.repository import BaseRepository
from core.serializers import serialize_document, serialize_documents
from queue_management.repositories import BookingRepository, CounterRepository
from queue_management.validators import validate_booking_create
from queue_management.broadcast import broadcast_queue_update

logger = logging.getLogger(__name__)

booking_repo = BookingRepository()
counter_repo = CounterRepository()


# ---------------------------------------------------------------------------
# Local read/write repositories for collections owned by other modules.
# Using BaseRepository directly (rather than importing SlotRepository from
# procurement) keeps this module import-independent of procurement's
# internal structure — only the collection contract is shared.
# ---------------------------------------------------------------------------

class _SlotRepo(BaseRepository):
    collection_name = Collections.SLOTS


class _CentreRepo(BaseRepository):
    collection_name = Collections.PROCUREMENT_CENTRES


class _FarmerRepo(BaseRepository):
    collection_name = Collections.FARMERS


slot_repo = _SlotRepo()
centre_repo = _CentreRepo()
farmer_repo = _FarmerRepo()


def _slot_counter_key(slot_id):
    """Each slot gets its own token sequence, so tokens restart at 1 per slot."""
    return f"slot_token:{slot_id}"


def _serialize_booking(booking_document):
    """Serialize a booking and attach the human-readable centre/slot context."""
    data = serialize_document(booking_document)

    slot = slot_repo.find_by_id(booking_document['slot_id'])
    centre = centre_repo.find_by_id(booking_document['centre_id'])

    slot_data = serialize_document(slot) or {}
    centre_data = serialize_document(centre) or {}

    data['slot'] = {
        'date': slot_data.get('date'),
        'start_time': slot_data.get('start_time'),
        'end_time': slot_data.get('end_time'),
    }

    data['centre'] = {
        'id': centre_data.get('id'),
        'name': centre_data.get('name'),
        'location': centre_data.get('location'),
        'contact_number': centre_data.get('contact_number'),
    }

    return data


def create_booking(farmer_user, data):
    """
    Book a procurement slot for the authenticated farmer.

    Implements the full flow from spec Section 8:
      1. Validate farmer authentication      -> caller guarantees this (IsFarmer)
      2. Validate the selected slot           -> exists, active
      3. Check slot availability              -> atomic reserve step below
      4. Prevent overbooking                  -> atomic $inc with $expr guard
      5. Prevent duplicate/conflicting bookings
      6. Create the booking
      7. Generate a unique token number        -> atomic per-slot counter
      8. Assign queue position
      9. Send booking confirmation notification
      10. Return booking confirmation

    Args:
        farmer_user: the AuthUser attached to the request (request.user).
        data: raw request body, expects {"slot_id": "..."}.

    Raises:
        NotFoundException  - slot or farmer profile missing.
        ConflictException  - slot inactive/full, or a conflicting booking exists.
    """
    cleaned = validate_booking_create(data)
    slot_id = cleaned['slot_id']

    # --- Load the farmer profile (bookings reference farmer_id = farmers._id) ---
    farmer_profile = farmer_repo.find_one({'user_id': farmer_user.object_id})
    if not farmer_profile:
        raise NotFoundException("Farmer profile not found.")

    farmer_id = farmer_profile['_id']

    # --- Validate the slot exists and is bookable at all -----------------------
    slot = slot_repo.find_by_id(slot_id)
    if not slot:
        raise NotFoundException("The selected procurement slot does not exist.")

    if not slot.get('is_active', True):
        raise ConflictException("This procurement slot is no longer active.")

    centre = centre_repo.find_by_id(slot['centre_id'])
    if not centre or not centre.get('is_active', True):
        raise ConflictException(
            "This procurement centre is not currently active."
        )

    # --- Prevent duplicate / conflicting bookings -------------------------------
    if booking_repo.has_active_booking_for_slot(farmer_id, slot['_id']):
        raise ConflictException("You have already booked this slot.")

    if booking_repo.has_any_active_booking_same_day(farmer_id, slot['date']):
        raise ConflictException(
            "You already have an active booking on this date. "
            "Cancel it before booking another slot on the same day."
        )

    # =============================================================
    # STEP 1: ATOMICALLY RESERVE A SEAT — this is the concurrency guard.
    #
    # The filter requires booked_count < max_farmers AT THE MOMENT OF
    # THE WRITE, not at the moment we last read the document. MongoDB
    # evaluates the filter and applies $inc as one atomic operation per
    # document, so concurrent requests cannot both pass this check for
    # the final open seat. Exactly one wins; the other gets None back
    # and is rejected cleanly below.
    # =============================================================
    updated_slot = slot_repo.collection.find_one_and_update(
        {
            '_id': slot['_id'],
            'is_active': True,
            '$expr': {'$lt': ['$booked_count', '$max_farmers']},
        },
        {'$inc': {'booked_count': 1}},
        return_document=True,
    )

    if updated_slot is None:
        # Either the slot filled up between our read above and this write,
        # or it was deactivated in that same window. Either way: no seat.
        raise ConflictException("This slot is already full.")

    try:
        # =============================================================
        # STEP 2: Generate a unique, sequential token for THIS slot.
        # Also atomic — two concurrent bookings can never receive the
        # same token number.
        # =============================================================
        token_number = counter_repo.next_value(
            _slot_counter_key(slot['_id'])
        )

        # =============================================================
        # STEP 3: Assign queue position.
        # Position = current token number within this slot, since tokens
        # are issued in strict booking order and never reused.
        # =============================================================
        queue_position = token_number

        # =============================================================
        # STEP 4: Create the booking document.
        # =============================================================
        booking_id = booking_repo.create({
            'farmer_id': farmer_id,
            'farmer_user_id': farmer_user.object_id,
            'centre_id': centre['_id'],
            'slot_id': slot['_id'],
            'booking_date': slot['date'],
            'token_number': token_number,
            'queue_position': queue_position,
            'status': BookingStatus.BOOKED,
            'cancelled_at': None,
            'cancellation_reason': None,
        })

    except Exception as exc:
        # =============================================================
        # COMPENSATING ROLLBACK: token generation or booking creation
        # failed after we already reserved a seat. Give the seat back so
        # the slot's availability count stays accurate. This is the
        # safety net for the (rare) case where step 2 or 3 throws.
        # =============================================================
        logger.error(
            "Booking creation failed after seat reservation, rolling back: %s",
            exc,
        )

        slot_repo.collection.update_one(
            {'_id': slot['_id']},
            {'$inc': {'booked_count': -1}},
        )

        raise

    booking = booking_repo.find_by_id(booking_id)

    # -----------------------------------------------------------------
    # Notification: tell the farmer that their slot was booked.
    # -----------------------------------------------------------------
    from notifications.services import notify
    from core.constants import NotificationType

    notify(
        user_id=farmer_user.object_id,
        notification_type=NotificationType.BOOKING_CONFIRMED,
        title="Slot Booked",
        message=(
            f"Your slot has been booked successfully. "
            f"Token number: #{token_number}."
        ),
    )

    # Push the updated queue to connected clients watching this slot.
    broadcast_queue_update(
        slot['_id'],
        get_queue_status(str(slot['_id']))
    )

    return _serialize_booking(booking)


def list_my_bookings(farmer_user, status_list=None):
    """Return all bookings for the authenticated farmer, newest first."""
    farmer_profile = farmer_repo.find_one(
        {'user_id': farmer_user.object_id}
    )

    if not farmer_profile:
        raise NotFoundException("Farmer profile not found.")

    bookings = booking_repo.find_by_farmer(
        farmer_profile['_id'],
        status_list,
    )

    return [_serialize_booking(booking) for booking in bookings]


def get_booking(farmer_user, booking_id):
    """Fetch a single booking, ensuring it belongs to the requesting farmer."""
    farmer_profile = farmer_repo.find_one(
        {'user_id': farmer_user.object_id}
    )

    if not farmer_profile:
        raise NotFoundException("Farmer profile not found.")

    booking = booking_repo.find_by_id(booking_id)

    if not booking or booking['farmer_id'] != farmer_profile['_id']:
        raise NotFoundException("Booking not found.")

    return _serialize_booking(booking)


def cancel_booking(farmer_user, booking_id, reason=None):
    """
    Cancel a booking.

    Only BOOKED or WAITING bookings can be cancelled by the farmer — once
    called (CALLED/PROCESSING) or finished (COMPLETED), cancellation no
    longer makes sense and staff would need to intervene manually.

    Frees the reserved seat on the slot by decrementing booked_count, so
    another farmer can book it.
    """
    from datetime import datetime, timezone

    farmer_profile = farmer_repo.find_one(
        {'user_id': farmer_user.object_id}
    )

    if not farmer_profile:
        raise NotFoundException("Farmer profile not found.")

    booking = booking_repo.find_by_id(booking_id)

    if not booking or booking['farmer_id'] != farmer_profile['_id']:
        raise NotFoundException("Booking not found.")

    if booking['status'] not in [
        BookingStatus.BOOKED,
        BookingStatus.WAITING,
    ]:
        raise ConflictException(
            f"A booking with status '{booking['status']}' cannot be cancelled."
        )

    booking_repo.update_by_id(
        booking_id,
        {
            'status': BookingStatus.CANCELLED,
            'cancelled_at': datetime.now(timezone.utc),
            'cancellation_reason': reason or 'Cancelled by farmer',
        },
    )

    # Free the seat so someone else can book it.
    slot_repo.collection.update_one(
        {'_id': booking['slot_id']},
        {'$inc': {'booked_count': -1}},
    )

    # -----------------------------------------------------------------
    # Notification: tell the farmer that their booking was cancelled.
    # -----------------------------------------------------------------
    from notifications.services import notify
    from core.constants import NotificationType

    notify(
        user_id=farmer_user.object_id,
        notification_type=NotificationType.BOOKING_CANCELLED,
        title="Booking Cancelled",
        message=(
            f"Your booking (Token #{booking['token_number']}) "
            f"has been cancelled."
        ),
    )

    # Broadcast the updated queue.
    broadcast_queue_update(
        booking['slot_id'],
        get_queue_status(str(booking['slot_id']))
    )

    return _serialize_booking(
        booking_repo.find_by_id(booking_id)
    )


# ---------------------------------------------------------------------------
# QUEUE MANAGEMENT (Step 8)
# ---------------------------------------------------------------------------

from core.validators import validate_object_id  # noqa: E402


def _booking_brief(booking):
    """Compact representation of a booking for queue-list display."""
    farmer = farmer_repo.find_by_id(booking['farmer_id'])

    return {
        'booking_id': str(booking['_id']),
        'token_number': booking.get('token_number'),
        'queue_position': booking.get('queue_position'),
        'farmer_name': farmer.get('full_name') if farmer else 'Unknown',
        'status': booking.get('status'),
    }


def get_queue_status(slot_id):
    """
    Return the full queue picture for one slot: who's being served, who's
    waiting, and how many. Used by both the staff Queue Control screen and
    (from Step 9) the farmer's live queue page.
    """
    slot_object_id = validate_object_id(
        slot_id,
        field_name="slot",
    )

    slot = slot_repo.find_by_id(slot_object_id)

    if not slot:
        raise NotFoundException("Procurement slot not found.")

    centre = centre_repo.find_by_id(slot['centre_id'])

    waiting = booking_repo.find_waiting(slot['_id'])
    in_service = booking_repo.find_in_service(slot['_id'])

    return {
        'slot': serialize_document(slot),
        'centre': serialize_document(centre),
        'current_token': slot.get('current_token'),
        'currently_serving': [
            _booking_brief(b) for b in in_service
        ],
        'waiting': [
            _booking_brief(b) for b in waiting
        ],
        'waiting_count': len(waiting),
    }


def call_next(slot_id):
    """
    Advance the queue for a slot: atomically claim the next waiting
    booking, mark it CALLED, and update the slot's current_token.

    Raises:
        NotFoundException  - slot doesn't exist.
        ConflictException  - no one is waiting in this queue.
    """
    slot_object_id = validate_object_id(
        slot_id,
        field_name="slot",
    )

    slot = slot_repo.find_by_id(slot_object_id)

    if not slot:
        raise NotFoundException("Procurement slot not found.")

    # === THE ATOMIC CLAIM — see repositories.py for the concurrency note ===
    next_booking = booking_repo.call_next_atomic(slot['_id'])

    if next_booking is None:
        raise ConflictException(
            "There are no farmers waiting in this queue."
        )

    # Update the slot's "now serving" marker so dashboards (Step 4's
    # farmer dashboard, and this module's queue status) reflect it.
    slot_repo.update_by_id(
        slot['_id'],
        {
            'current_token': next_booking['token_number'],
        },
    )

    farmer = farmer_repo.find_by_id(next_booking['farmer_id'])

    # -----------------------------------------------------------------
    # Notification: tell the farmer that their token has been called.
    # -----------------------------------------------------------------
    from notifications.services import notify
    from core.constants import NotificationType

    if next_booking.get('farmer_user_id'):
        notify(
            user_id=next_booking['farmer_user_id'],
            notification_type=NotificationType.FARMER_CALLED,
            title="You've Been Called!",
            message=(
                f"Your token #{next_booking['token_number']} has been called. "
                f"Please proceed to the counter."
            ),
        )

    result = {
        'booking_id': str(next_booking['_id']),
        'token_number': next_booking['token_number'],
        'farmer_id': str(next_booking['farmer_id']),
        'farmer_user_id': (
            str(next_booking.get('farmer_user_id'))
            if next_booking.get('farmer_user_id')
            else None
        ),
        'farmer_name': (
            farmer.get('full_name')
            if farmer
            else 'Unknown'
        ),
        'queue_position': next_booking['queue_position'],
        'slot_id': str(slot['_id']),
        'status': BookingStatus.CALLED,
    }

    # Broadcast the fresh queue state after the queue has changed.
    broadcast_queue_update(
        slot['_id'],
        get_queue_status(str(slot['_id']))
    )

    return result