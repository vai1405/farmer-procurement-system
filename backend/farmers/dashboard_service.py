"""
Farmer dashboard aggregation.

Assembles everything the dashboard needs in ONE API call, so the frontend
makes a single request instead of six.

The dashboard keeps two concepts separate:

1. Active booking:
   Used for live queue information.

2. Latest non-cancelled booking:
   Used for displaying the booking, procurement, and payment history
   after the queue has been completed.
"""

from datetime import datetime, timezone

from bson import ObjectId

from accounts.repositories import UserRepository
from core.constants import (
    AVERAGE_SERVICE_MINUTES,
    BookingStatus,
    Collections,
    PaymentStatus,
    ProcurementStatus,
)
from core.exceptions import NotFoundException
from core.repository import BaseRepository
from core.serializers import serialize_document
from farmers.repositories import FarmerRepository


# Lightweight read-only repositories for cross-module queries.
class _ReadRepository(BaseRepository):
    """Generic read-only repository created per collection below."""


def _read_repo(collection_name):
    return type(
        f'_Repo_{collection_name}',
        (_ReadRepository,),
        {'collection_name': collection_name},
    )()


farmer_repo = FarmerRepository()
user_repo = UserRepository()
booking_repo = _read_repo(Collections.BOOKINGS)
slot_repo = _read_repo(Collections.SLOTS)
centre_repo = _read_repo(Collections.PROCUREMENT_CENTRES)
procurement_repo = _read_repo(Collections.PROCUREMENTS)
payment_repo = _read_repo(Collections.PAYMENTS)
notification_repo = _read_repo(Collections.NOTIFICATIONS)


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------
def _build_queue_info(booking):
    """
    Compute live queue figures for a booking.

    "People before you" is derived from queue_position rather than token
    number, because cancellations leave gaps in token numbers while queue
    positions stay meaningful.
    """
    slot_id = booking.get('slot_id')
    queue_position = booking.get('queue_position', 0)

    people_before = booking_repo.count({
        'slot_id': slot_id,
        'queue_position': {'$lt': queue_position},
        'status': {
            '$in': [
                BookingStatus.BOOKED,
                BookingStatus.WAITING,
            ]
        },
    })

    slot = slot_repo.find_by_id(slot_id) if slot_id else None
    current_token = (slot or {}).get('current_token')

    # Once called or being processed, there is no remaining wait.
    if booking.get('status') in [
        BookingStatus.CALLED,
        BookingStatus.PROCESSING,
    ]:
        people_before = 0
        estimated_wait = 0
    else:
        estimated_wait = people_before * AVERAGE_SERVICE_MINUTES

    return {
        'your_token': booking.get('token_number'),
        'current_token': current_token,
        'people_before_you': people_before,
        'estimated_wait_minutes': estimated_wait,
    }


def _build_booking_summary(booking):
    """Flatten a booking plus its slot and centre into one display object."""
    slot = (
        slot_repo.find_by_id(booking['slot_id'])
        if booking.get('slot_id')
        else None
    )

    centre = (
        centre_repo.find_by_id(booking['centre_id'])
        if booking.get('centre_id')
        else None
    )

    slot_data = serialize_document(slot) or {}
    centre_data = serialize_document(centre) or {}
    booking_data = serialize_document(booking)

    return {
        'booking_id': booking_data['id'],
        'slot_id': str(booking['slot_id']),
        'token_number': booking_data.get('token_number'),
        'queue_position': booking_data.get('queue_position'),
        'status': booking_data.get('status'),
        'centre_name': centre_data.get('name'),
        'centre_location': centre_data.get('location'),
        'date': slot_data.get('date'),
        'start_time': slot_data.get('start_time'),
        'end_time': slot_data.get('end_time'),
        'created_at': booking_data.get('created_at'),
    }


def _empty_procurement():
    return {
        'exists': False,
        'status': ProcurementStatus.PENDING,
        'crop_name': None,
        'quantity': None,
        'unit': None,
        'price_per_unit': None,
        'total_amount': None,
    }


def _build_procurement_summary(booking_id):
    """Return the procurement record linked to a booking, if one exists."""
    if booking_id is None:
        return _empty_procurement()

    procurement = procurement_repo.find_one({
        'booking_id': booking_id,
    })

    if not procurement:
        return _empty_procurement()

    data = serialize_document(procurement)

    return {
        'exists': True,
        'procurement_id': data['id'],
        'status': data.get('status'),
        'crop_name': data.get('crop_name'),
        'quantity': data.get('quantity'),
        'unit': data.get('unit'),
        'price_per_unit': data.get('price_per_unit'),
        'total_amount': data.get('total_amount'),
    }


def _build_payment_summary(procurement_summary):
    """Return the payment record linked to a procurement, if one exists."""
    fallback = {
        'exists': False,
        'status': PaymentStatus.PENDING,
        'amount': procurement_summary.get('total_amount'),
        'transaction_id': None,
        'payment_date': None,
        'payment_method': None,
    }

    if not procurement_summary.get('exists'):
        return fallback

    try:
        procurement_id = ObjectId(
            procurement_summary['procurement_id']
        )
    except (TypeError, ValueError):
        return fallback

    payment = payment_repo.find_one({
        'procurement_id': procurement_id,
    })

    if not payment:
        return fallback

    data = serialize_document(payment)

    return {
        'exists': True,
        'payment_id': data['id'],
        'status': data.get('status'),
        'amount': data.get('amount'),
        'transaction_id': data.get('transaction_id'),
        'payment_date': data.get('payment_date'),
        'payment_method': data.get('payment_method'),
    }


def _build_statistics(farmer_id):
    """Lifetime counters shown as small stat tiles on the dashboard."""
    total_bookings = booking_repo.count({
        'farmer_id': farmer_id,
    })

    completed_bookings = booking_repo.count({
        'farmer_id': farmer_id,
        'status': BookingStatus.COMPLETED,
    })

    paid = payment_repo.aggregate([
        {
            '$match': {
                'farmer_id': farmer_id,
                'status': PaymentStatus.PAID,
            }
        },
        {
            '$group': {
                '_id': None,
                'total': {'$sum': '$amount'},
            }
        },
    ])

    total_earnings = paid[0]['total'] if paid else 0

    return {
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'total_earnings': round(float(total_earnings), 2),
    }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def get_dashboard(user_id):
    """
    Build the complete farmer dashboard payload in a single call.

    Active bookings are used for live queue information.

    If there is no active booking, the latest non-cancelled booking is used
    so completed procurement and payment information remains visible.

    Raises:
        NotFoundException if the farmer profile is missing.
    """
    user_document = user_repo.find_by_id(user_id)

    if not user_document:
        raise NotFoundException("User account not found.")

    farmer = farmer_repo.find_by_user_id(user_document['_id'])

    if not farmer:
        raise NotFoundException("Farmer profile not found.")

    farmer_id = farmer['_id']

    # ------------------------------------------------------------------
    # 1. Find the active booking for live queue information.
    # ------------------------------------------------------------------
    active_bookings = booking_repo.find_many(
        {
            'farmer_id': farmer_id,
            'status': {
                '$in': BookingStatus.ACTIVE,
            },
        },
        sort=[('created_at', 1)],
        limit=1,
    )

    active_booking = (
        active_bookings[0]
        if active_bookings
        else None
    )

    # ------------------------------------------------------------------
    # 2. Find the latest non-cancelled booking.
    #
    # This is important after the booking becomes COMPLETED.
    # A completed booking is no longer ACTIVE, but its procurement
    # and payment information must remain visible to the farmer.
    # ------------------------------------------------------------------
    recent_bookings = booking_repo.find_many(
        {
            'farmer_id': farmer_id,
            'status': {
                '$ne': BookingStatus.CANCELLED,
            },
        },
        sort=[('created_at', -1)],
        limit=1,
    )

    recent_booking = (
        recent_bookings[0]
        if recent_bookings
        else None
    )

    # Use active booking when one exists.
    # Otherwise use the latest completed/non-cancelled booking.
    booking = (
        active_booking
        if active_booking is not None
        else recent_booking
    )

    unread_count = notification_repo.count({
        'user_id': farmer['user_id'],
        'is_read': False,
    })

    # ------------------------------------------------------------------
    # Default payload
    # ------------------------------------------------------------------
    payload = {
        'farmer': {
            'id': str(farmer_id),
            'full_name': farmer.get('full_name'),
            'village': farmer.get('village'),
            'district': farmer.get('district'),
            'state': farmer.get('state'),
        },

        # IMPORTANT:
        # This remains TRUE only when there is an actual active booking.
        # A completed booking should not be considered an active queue.
        'has_active_booking': active_booking is not None,

        'booking': None,

        # Queue information only belongs to an active booking.
        'queue': None,

        'procurement': _empty_procurement(),

        'payment': _build_payment_summary(
            _empty_procurement()
        ),

        'statistics': _build_statistics(farmer_id),

        'unread_notifications': unread_count,

        'generated_at': datetime.now(
            timezone.utc
        ).isoformat(),
    }

    # ------------------------------------------------------------------
    # Build booking/procurement/payment information.
    # ------------------------------------------------------------------
    if booking:
        procurement_summary = _build_procurement_summary(
            booking['_id']
        )

        payload.update({
            'booking': _build_booking_summary(booking),
            'procurement': procurement_summary,
            'payment': _build_payment_summary(
                procurement_summary
            ),
        })

        # Queue data should ONLY be generated for an active booking.
        if active_booking is not None:
            payload['queue'] = _build_queue_info(
                active_booking
            )

    return payload