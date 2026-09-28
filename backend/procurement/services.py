"""
Business logic for procurement centre management.

Repositories only run queries; this layer enforces the RULES:
  - centre names should not be exact duplicates (soft warning)
  - a centre with existing slots/bookings cannot be hard-deleted
  - deactivating a centre is always allowed
"""

from core.constants import BookingStatus, Collections, ProcurementStatus
from core.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from core.repository import BaseRepository
from core.serializers import serialize_document, serialize_documents

from procurement.repositories import (
    CentreRepository,
    ProcurementRepository,
    SlotRepository,
)

from procurement.validators import (
    validate_centre_create,
    validate_centre_update,
    validate_procurement_create,
    validate_procurement_update,
    validate_slot_create,
    validate_slot_update,
)


# ===========================================================================
# CENTRE BUSINESS LOGIC
# ===========================================================================

centre_repo = CentreRepository()


# Read-only repositories used only to check for references before a
# hard delete.
class _SlotCheckRepository(BaseRepository):
    collection_name = Collections.SLOTS


class _BookingCheckRepository(BaseRepository):
    collection_name = Collections.BOOKINGS


slot_check_repo = _SlotCheckRepository()
booking_check_repo = _BookingCheckRepository()


def list_centres(keyword=None, is_active=None, page=1, page_size=20):
    """
    Return a paginated, searchable list of centres.

    Args:
        keyword: optional search string matched against name/location.
        is_active: optional True/False filter.
        page: 1-indexed page number.
        page_size: results per page.
    """
    skip = (page - 1) * page_size

    centres = centre_repo.search(
        keyword,
        is_active,
        skip=skip,
        limit=page_size,
    )

    total = centre_repo.count_search(
        keyword,
        is_active,
    )

    return {
        'centres': serialize_documents(centres),
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(
                1,
                (total + page_size - 1) // page_size,
            ),
        },
    }


def get_active_centres():
    """Public-ish read used by farmers browsing where to book."""
    return serialize_documents(
        centre_repo.active_centres()
    )


def get_centre(centre_id):
    """Fetch a single centre by id."""
    centre = centre_repo.find_by_id(centre_id)

    if not centre:
        raise NotFoundException(
            "Procurement centre not found."
        )

    return serialize_document(centre)


def create_centre(data):
    """
    Create a new procurement centre.

    Duplicate centre names are blocked to avoid accidental
    duplicate data entry.
    """
    cleaned = validate_centre_create(data)

    if centre_repo.name_exists(cleaned['name']):
        raise ConflictException(
            f"A centre named '{cleaned['name']}' already exists."
        )

    centre_id = centre_repo.create(cleaned)

    return get_centre(centre_id)


def update_centre(centre_id, data):
    """Update an existing centre. Supports partial updates."""
    cleaned = validate_centre_update(data)

    existing = centre_repo.find_by_id(centre_id)

    if not existing:
        raise NotFoundException(
            "Procurement centre not found."
        )

    if (
        'name' in cleaned
        and cleaned['name'].lower() != existing['name'].lower()
    ):
        if centre_repo.name_exists(
            cleaned['name'],
            exclude_id=existing['_id'],
        ):
            raise ConflictException(
                f"A centre named '{cleaned['name']}' already exists."
            )

    centre_repo.update_by_id(
        centre_id,
        cleaned,
    )

    return get_centre(centre_id)


def set_centre_status(centre_id, is_active):
    """
    Activate or deactivate a centre.

    Deactivation is preferred over deletion because it
    preserves historical records.
    """
    existing = centre_repo.find_by_id(centre_id)

    if not existing:
        raise NotFoundException(
            "Procurement centre not found."
        )

    centre_repo.update_by_id(
        centre_id,
        {
            'is_active': bool(is_active),
        },
    )

    return get_centre(centre_id)


def delete_centre(centre_id):
    """
    Permanently delete a centre.

    Blocked if the centre has any slots or bookings.
    """
    existing = centre_repo.find_by_id(centre_id)

    if not existing:
        raise NotFoundException(
            "Procurement centre not found."
        )

    object_id = existing['_id']

    if slot_check_repo.exists({
        'centre_id': object_id,
    }):
        raise ConflictException(
            "This centre has procurement slots associated "
            "with it and cannot be deleted. Deactivate it "
            "instead to hide it from farmers."
        )

    if booking_check_repo.exists({
        'centre_id': object_id,
    }):
        raise ConflictException(
            "This centre has bookings associated with it "
            "and cannot be deleted. Deactivate it instead."
        )

    centre_repo.delete_by_id(centre_id)


# ===========================================================================
# SLOT BUSINESS LOGIC
# ===========================================================================

slot_repo = SlotRepository()


def _serialize_slot(slot_document):
    """
    Serialize a slot and add computed display fields.
    """
    data = serialize_document(slot_document)

    max_farmers = data.get(
        'max_farmers',
        0,
    )

    booked_count = data.get(
        'booked_count',
        0,
    )

    data['available_count'] = max(
        0,
        max_farmers - booked_count,
    )

    data['is_full'] = (
        booked_count >= max_farmers
    )

    return data


def _serialize_slot_with_centre(slot_document):
    """Attach basic centre information to a slot."""
    data = _serialize_slot(
        slot_document
    )

    centre = centre_repo.find_by_id(
        slot_document['centre_id']
    )

    if centre:
        data['centre_name'] = centre.get(
            'name'
        )

        data['centre_location'] = centre.get(
            'location'
        )

    return data


def create_slot(data):
    """
    Create a new procurement slot.

    Rules:
      - centre must exist
      - centre must be active
      - time range must not overlap another slot
    """
    cleaned = validate_slot_create(data)

    centre = centre_repo.find_by_id(
        cleaned['centre_id']
    )

    if not centre:
        raise NotFoundException(
            "The selected procurement centre does not exist."
        )

    if not centre.get(
        'is_active',
        True,
    ):
        raise ConflictException(
            "Cannot create a slot for an inactive centre. "
            "Activate the centre first."
        )

    overlapping = slot_repo.find_overlapping(
        cleaned['centre_id'],
        cleaned['date'],
        cleaned['start_time'],
        cleaned['end_time'],
    )

    if overlapping:
        raise ConflictException(
            "This time range overlaps with an existing "
            "slot at this centre "
            f"({overlapping[0]['start_time']} - "
            f"{overlapping[0]['end_time']})."
        )

    slot_id = slot_repo.create(
        cleaned
    )

    slot = slot_repo.find_by_id(
        slot_id
    )

    return _serialize_slot_with_centre(
        slot
    )


def update_slot(slot_id, data):
    """
    Update an existing slot.

    Rules:
      - max_farmers cannot be below booked_count
      - booked slot date cannot be changed
      - changed date/time must not overlap another slot
    """
    cleaned = validate_slot_update(data)

    existing = slot_repo.find_by_id(
        slot_id
    )

    if not existing:
        raise NotFoundException(
            "Procurement slot not found."
        )

    booked_count = existing.get(
        'booked_count',
        0,
    )

    if (
        'max_farmers' in cleaned
        and cleaned['max_farmers'] < booked_count
    ):
        raise ValidationException(
            "Cannot reduce capacity below the current "
            f"booked count ({booked_count} farmers already booked)."
        )

    if (
        'date' in cleaned
        and booked_count > 0
    ):
        raise ConflictException(
            "Cannot change the date of a slot "
            "that already has bookings."
        )

    new_start = cleaned.get(
        'start_time',
        existing['start_time'],
    )

    new_end = cleaned.get(
        'end_time',
        existing['end_time'],
    )

    new_date = cleaned.get(
        'date',
        existing['date'],
    )

    if (
        'start_time' in cleaned
        or 'end_time' in cleaned
        or 'date' in cleaned
    ):
        if new_end <= new_start:
            raise ValidationException(
                "End time must be after start time."
            )

        overlapping = slot_repo.find_overlapping(
            existing['centre_id'],
            new_date,
            new_start,
            new_end,
            exclude_id=existing['_id'],
        )

        if overlapping:
            raise ConflictException(
                "This time range overlaps with another "
                "slot at this centre."
            )

    slot_repo.update_by_id(
        slot_id,
        cleaned,
    )

    updated_slot = slot_repo.find_by_id(
        slot_id
    )

    return _serialize_slot_with_centre(
        updated_slot
    )


def set_slot_status(slot_id, is_active):
    """Activate or deactivate a slot."""
    existing = slot_repo.find_by_id(
        slot_id
    )

    if not existing:
        raise NotFoundException(
            "Procurement slot not found."
        )

    slot_repo.update_by_id(
        slot_id,
        {
            'is_active': bool(is_active),
        },
    )

    updated_slot = slot_repo.find_by_id(
        slot_id
    )

    return _serialize_slot_with_centre(
        updated_slot
    )


def delete_slot(slot_id):
    """
    Permanently delete a slot.

    Blocked if the slot has bookings.
    """
    existing = slot_repo.find_by_id(
        slot_id
    )

    if not existing:
        raise NotFoundException(
            "Procurement slot not found."
        )

    if booking_check_repo.exists({
        'slot_id': existing['_id'],
    }):
        raise ConflictException(
            "This slot has bookings associated with it "
            "and cannot be deleted. Deactivate it instead."
        )

    slot_repo.delete_by_id(
        slot_id
    )


def list_slots(
    centre_id=None,
    date_from=None,
    date_to=None,
    status=None,
    page=1,
    page_size=20,
):
    """Paginated slot listing for the staff management table."""
    from core.validators import (
        validate_date_string,
        validate_object_id,
    )

    centre_object_id = (
        validate_object_id(
            centre_id,
            "centre",
        )
        if centre_id
        else None
    )

    date_from_parsed = (
        validate_date_string(
            date_from,
            "date_from",
        )
        if date_from
        else None
    )

    date_to_parsed = (
        validate_date_string(
            date_to,
            "date_to",
        )
        if date_to
        else None
    )

    skip = (
        page - 1
    ) * page_size

    slots = slot_repo.search(
        centre_object_id,
        date_from_parsed,
        date_to_parsed,
        status,
        skip=skip,
        limit=page_size,
    )

    total = slot_repo.count_search(
        centre_object_id,
        date_from_parsed,
        date_to_parsed,
        status,
    )

    return {
        'slots': [
            _serialize_slot_with_centre(slot)
            for slot in slots
        ],
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(
                1,
                (total + page_size - 1) // page_size,
            ),
        },
    }


def get_slot(slot_id):
    """Fetch a single slot with centre details."""
    slot = slot_repo.find_by_id(
        slot_id
    )

    if not slot:
        raise NotFoundException(
            "Procurement slot not found."
        )

    return _serialize_slot_with_centre(
        slot
    )


def get_available_slots(centre_id):
    """
    Farmer-facing:
    active, non-full, upcoming slots for one centre.
    """
    from core.validators import validate_object_id

    centre = centre_repo.find_by_id(
        validate_object_id(
            centre_id,
            "centre",
        )
    )

    if not centre:
        raise NotFoundException(
            "Procurement centre not found."
        )

    if not centre.get(
        'is_active',
        True,
    ):
        raise ConflictException(
            "This procurement centre is not currently active."
        )

    slots = slot_repo.find_available_for_centre(
        centre['_id']
    )

    return {
        'centre': serialize_document(
            centre
        ),
        'slots': [
            _serialize_slot(slot)
            for slot in slots
        ],
    }


# ===========================================================================
# PROCUREMENT BUSINESS LOGIC - STEP 10
# ===========================================================================

procurement_repo = ProcurementRepository()


class _BookingRepo(BaseRepository):
    collection_name = Collections.BOOKINGS


class _FarmerRepo(BaseRepository):
    collection_name = Collections.FARMERS


booking_repo_ro = _BookingRepo()
farmer_repo_ro = _FarmerRepo()


def _serialize_procurement(procurement_document):
    """
    Serialize a procurement record and attach:
      - farmer name
      - farmer village
      - centre name
      - token number
    """
    data = serialize_document(
        procurement_document
    )

    farmer = farmer_repo_ro.find_by_id(
        procurement_document['farmer_id']
    )

    centre = centre_repo.find_by_id(
        procurement_document['centre_id']
    )

    booking = booking_repo_ro.find_by_id(
        procurement_document['booking_id']
    )

    data['farmer_name'] = (
        farmer.get('full_name')
        if farmer
        else 'Unknown'
    )

    data['farmer_village'] = (
        farmer.get('village')
        if farmer
        else None
    )

    data['centre_name'] = (
        centre.get('name')
        if centre
        else 'Unknown'
    )

    data['token_number'] = (
        booking.get('token_number')
        if booking
        else None
    )

    return data


def create_procurement(data):
    """
    Record a procurement for a called farmer.

    Rules:
      - booking must exist
      - booking must be CALLED or PROCESSING
      - one procurement record per booking
      - total_amount is calculated on backend
    """
    cleaned = validate_procurement_create(
        data
    )

    booking = booking_repo_ro.find_by_id(
        cleaned['booking_id']
    )

    if not booking:
        raise NotFoundException(
            "Booking not found."
        )

    if booking['status'] not in [
        BookingStatus.CALLED,
        BookingStatus.PROCESSING,
    ]:
        raise ConflictException(
            f"Cannot record procurement for a booking "
            f"with status '{booking['status']}'. "
            "The farmer must be called first."
        )

    existing_procurement = (
        procurement_repo.find_by_booking(
            booking['_id']
        )
    )

    if existing_procurement:
        raise ConflictException(
            "A procurement record already exists for this booking."
        )

    # Backend calculation.
    # Never trust total_amount sent by frontend.
    total_amount = round(
        cleaned['quantity']
        * cleaned['price_per_unit'],
        2,
    )

    procurement_id = procurement_repo.create({
        'booking_id': booking['_id'],
        'farmer_id': booking['farmer_id'],
        'centre_id': booking['centre_id'],
        'crop_name': cleaned['crop_name'],
        'quantity': cleaned['quantity'],
        'unit': cleaned['unit'],
        'price_per_unit': cleaned['price_per_unit'],
        'total_amount': total_amount,
        'quality_notes': cleaned['quality_notes'],
        'procurement_date': booking['booking_date'],
        'status': ProcurementStatus.PENDING,
    })

    # CALLED -> PROCESSING
    if booking['status'] == BookingStatus.CALLED:
        booking_repo_ro.update_by_id(
            booking['_id'],
            {
                'status': BookingStatus.PROCESSING,
            },
        )

    procurement = procurement_repo.find_by_id(
        procurement_id
    )

    return _serialize_procurement(
        procurement
    )


def update_procurement(procurement_id, data):
    """
    Update a procurement record.

    If quantity or price_per_unit changes,
    total_amount is recalculated.

    If status becomes COMPLETED,
    linked booking becomes COMPLETED and
    the farmer receives a notification.
    """
    cleaned = validate_procurement_update(
        data
    )

    existing = procurement_repo.find_by_id(
        procurement_id
    )

    if not existing:
        raise NotFoundException(
            "Procurement record not found."
        )

    # Recalculate total_amount from final values.
    if (
        'quantity' in cleaned
        or 'price_per_unit' in cleaned
    ):
        new_quantity = cleaned.get(
            'quantity',
            existing['quantity'],
        )

        new_price = cleaned.get(
            'price_per_unit',
            existing['price_per_unit'],
        )

        cleaned['total_amount'] = round(
            new_quantity * new_price,
            2,
        )

    procurement_repo.update_by_id(
        procurement_id,
        cleaned,
    )

    # COMPLETED procurement -> COMPLETED booking.
    if (
        cleaned.get('status')
        == ProcurementStatus.COMPLETED
    ):
        booking_repo_ro.update_by_id(
            existing['booking_id'],
            {
                'status': BookingStatus.COMPLETED,
            },
        )

        # -------------------------------------------------------------
        # Notification: tell the farmer that procurement is completed.
        # -------------------------------------------------------------
        from notifications.services import notify
        from core.constants import NotificationType

        booking = booking_repo_ro.find_by_id(
            existing['booking_id']
        )

        if booking and booking.get('farmer_user_id'):
            notify(
                user_id=booking['farmer_user_id'],
                notification_type=NotificationType.PROCUREMENT_COMPLETED,
                title="Procurement Completed",
                message=(
                    f"Your procurement of {existing['quantity']} "
                    f"{existing['unit']} "
                    f"{existing['crop_name']} "
                    f"has been completed."
                ),
            )

    return _serialize_procurement(
        procurement_repo.find_by_id(
            procurement_id
        )
    )


def get_procurement(procurement_id):
    """Fetch a single procurement record."""
    procurement = procurement_repo.find_by_id(
        procurement_id
    )

    if not procurement:
        raise NotFoundException(
            "Procurement record not found."
        )

    return _serialize_procurement(
        procurement
    )


def get_procurement_by_booking(booking_id):
    """
    Find procurement record by booking.

    Used by the staff Queue Control screen to check
    whether a called farmer already has procurement.
    """
    from core.validators import validate_object_id

    booking_object_id = validate_object_id(
        booking_id,
        field_name="booking",
    )

    procurement = procurement_repo.find_by_booking(
        booking_object_id
    )

    if not procurement:
        return None

    return _serialize_procurement(
        procurement
    )


def list_procurements(
    centre_id=None,
    farmer_id=None,
    status=None,
    date_from=None,
    date_to=None,
    page=1,
    page_size=20,
):
    """
    Paginated procurement history for the
    staff management table.
    """
    from core.validators import (
        validate_date_string,
        validate_object_id,
    )

    centre_object_id = (
        validate_object_id(
            centre_id,
            "centre",
        )
        if centre_id
        else None
    )

    farmer_object_id = (
        validate_object_id(
            farmer_id,
            "farmer",
        )
        if farmer_id
        else None
    )

    date_from_parsed = (
        validate_date_string(
            date_from,
            "date_from",
        )
        if date_from
        else None
    )

    date_to_parsed = (
        validate_date_string(
            date_to,
            "date_to",
        )
        if date_to
        else None
    )

    skip = (
        page - 1
    ) * page_size

    records = procurement_repo.search(
        centre_object_id,
        farmer_object_id,
        status,
        date_from_parsed,
        date_to_parsed,
        skip=skip,
        limit=page_size,
    )

    total = procurement_repo.count_search(
        centre_object_id,
        farmer_object_id,
        status,
        date_from_parsed,
        date_to_parsed,
    )

    return {
        'procurements': [
            _serialize_procurement(record)
            for record in records
        ],
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(
                1,
                (total + page_size - 1) // page_size,
            ),
        },
    }