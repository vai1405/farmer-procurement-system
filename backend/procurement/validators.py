"""
Validation for procurement centre payloads.

This file will grow in Step 6 to include slot validation too — centres
and slots are naturally grouped under the same `procurement` app since a
slot always belongs to a centre.
"""

from core.exceptions import ValidationException
from core.validators import (
    validate_phone,
    validate_positive_number,
    validate_required,
)

CENTRE_REQUIRED_FIELDS = [
    'name',
    'location',
    'contact_number',
    'daily_capacity',
]


def validate_centre_create(data):
    """
    Validate a new procurement centre payload.

    Returns:
        dict: cleaned fields ready to insert.
    """
    validate_required(data, CENTRE_REQUIRED_FIELDS)

    name = str(data['name']).strip()

    if len(name) < 3:
        raise ValidationException(
            "Centre name must be at least 3 characters long."
        )

    location = str(data['location']).strip()

    if len(location) < 3:
        raise ValidationException(
            "Location must be at least 3 characters long."
        )

    daily_capacity = validate_positive_number(
        data['daily_capacity'],
        field_name="Daily capacity"
    )

    return {
        'name': name,
        'location': location,
        'contact_number': validate_phone(data['contact_number']),
        'daily_capacity': int(daily_capacity),
        'is_active': bool(data.get('is_active', True)),
    }


def validate_centre_update(data):
    """
    Validate a centre update payload.

    Supports partial updates — only fields present in `data`
    are validated and returned.
    """
    cleaned = {}

    if 'name' in data:
        name = str(data['name']).strip()

        if len(name) < 3:
            raise ValidationException(
                "Centre name must be at least 3 characters long."
            )

        cleaned['name'] = name

    if 'location' in data:
        location = str(data['location']).strip()

        if len(location) < 3:
            raise ValidationException(
                "Location must be at least 3 characters long."
            )

        cleaned['location'] = location

    if 'contact_number' in data:
        cleaned['contact_number'] = validate_phone(
            data['contact_number']
        )

    if 'daily_capacity' in data:
        cleaned['daily_capacity'] = int(
            validate_positive_number(
                data['daily_capacity'],
                field_name="Daily capacity"
            )
        )

    if 'is_active' in data:
        cleaned['is_active'] = bool(data['is_active'])

    if not cleaned:
        raise ValidationException(
            "No valid fields were provided to update."
        )

    return cleaned


# ---------------------------------------------------------------------------
# SLOT VALIDATION
# ---------------------------------------------------------------------------

from core.validators import (
    validate_date_string,
    validate_time_string,
)  # noqa: E402


SLOT_REQUIRED_FIELDS = [
    'centre_id',
    'date',
    'start_time',
    'end_time',
    'max_farmers',
]


def _validate_time_order(start_time, end_time):
    """
    Ensure end_time is strictly after start_time.
    Both values must be HH:MM strings.
    """
    from datetime import datetime as dt

    start = dt.strptime(start_time, '%H:%M')
    end = dt.strptime(end_time, '%H:%M')

    if end <= start:
        raise ValidationException(
            "End time must be after start time."
        )


def validate_slot_create(data):
    """
    Validate a new procurement slot payload.

    Returns:
        dict with keys:
        - centre_id: ObjectId
        - date: datetime
        - start_time: HH:MM string
        - end_time: HH:MM string
        - max_farmers: int
        - is_active: bool
    """
    validate_required(data, SLOT_REQUIRED_FIELDS)

    from core.validators import validate_object_id

    centre_id = validate_object_id(
        data['centre_id'],
        field_name="centre"
    )

    date = validate_date_string(
        data['date'],
        field_name="date"
    )

    start_time = validate_time_string(
        data['start_time'],
        field_name="start time"
    )

    end_time = validate_time_string(
        data['end_time'],
        field_name="end time"
    )

    _validate_time_order(
        start_time,
        end_time
    )

    max_farmers = validate_positive_number(
        data['max_farmers'],
        field_name="Maximum farmers"
    )

    # A slot cannot be scheduled in the past.
    from datetime import datetime as dt

    if date.date() < dt.now().date():
        raise ValidationException(
            "Cannot create a slot for a past date."
        )

    # IMPORTANT:
    # This return must be OUTSIDE the past-date if block.
    return {
        'centre_id': centre_id,
        'date': date,
        'start_time': start_time,
        'end_time': end_time,
        'max_farmers': int(max_farmers),
        'booked_count': 0,
        'current_token': None,
        'is_active': bool(data.get('is_active', True)),
    }


def validate_slot_update(data):
    """
    Validate a slot update payload.

    Supports partial updates.

    Note:
        `max_farmers` CAN be edited, but the service layer
        must reject shrinking it below the current booked_count.
    """
    cleaned = {}

    if 'date' in data:
        from datetime import datetime as dt

        date = validate_date_string(
            data['date'],
            field_name="date"
        )

        if date.date() < dt.now().date():
            raise ValidationException(
                "Cannot set a slot to a past date."
            )

        cleaned['date'] = date

    if 'start_time' in data:
        cleaned['start_time'] = validate_time_string(
            data['start_time'],
            field_name="start time"
        )

    if 'end_time' in data:
        cleaned['end_time'] = validate_time_string(
            data['end_time'],
            field_name="end time"
        )

    if 'start_time' in cleaned or 'end_time' in cleaned:
        # Both are required together so we can validate ordering safely.
        # The service layer merges these with the existing document first.
        pass

    if 'max_farmers' in data:
        cleaned['max_farmers'] = int(
            validate_positive_number(
                data['max_farmers'],
                field_name="Maximum farmers"
            )
        )

    if 'is_active' in data:
        cleaned['is_active'] = bool(data['is_active'])

    if not cleaned:
        raise ValidationException(
            "No valid fields were provided to update."
        )

    return cleaned


# ---------------------------------------------------------------------------
# PROCUREMENT VALIDATION (Step 10)
# ---------------------------------------------------------------------------

from core.constants import ProcurementStatus  # noqa: E402


PROCUREMENT_REQUIRED_FIELDS = [
    'booking_id',
    'crop_name',
    'quantity',
    'unit',
    'price_per_unit',
]

VALID_UNITS = [
    'kg',
    'quintal',
    'tonne',
]


def validate_procurement_create(data):
    """
    Validate a new procurement record payload.

    Deliberately does NOT accept total_amount from the client.
    It is always computed server-side in the service layer from:

        quantity * price_per_unit
    """
    from core.validators import validate_object_id

    validate_required(
        data,
        PROCUREMENT_REQUIRED_FIELDS
    )

    crop_name = str(data['crop_name']).strip()

    if len(crop_name) < 2:
        raise ValidationException(
            "Crop name must be at least 2 characters long."
        )

    unit = str(data['unit']).strip().lower()

    if unit not in VALID_UNITS:
        raise ValidationException(
            f"Invalid unit. Allowed values: {', '.join(VALID_UNITS)}."
        )

    quantity = validate_positive_number(
        data['quantity'],
        field_name="Quantity"
    )

    price_per_unit = validate_positive_number(
        data['price_per_unit'],
        field_name="Price per unit"
    )

    quality_notes = str(
        data.get('quality_notes', '')
    ).strip()

    return {
        'booking_id': validate_object_id(
            data['booking_id'],
            field_name="booking"
        ),
        'crop_name': crop_name,
        'quantity': round(float(quantity), 2),
        'unit': unit,
        'price_per_unit': round(float(price_per_unit), 2),
        'quality_notes': quality_notes,
    }


def validate_procurement_update(data):
    """
    Validate a procurement update payload.

    Supports partial updates.

    `total_amount` is never accepted directly.
    If quantity or price_per_unit changes, the service layer
    recomputes it.
    """
    cleaned = {}

    if 'crop_name' in data:
        crop_name = str(data['crop_name']).strip()

        if len(crop_name) < 2:
            raise ValidationException(
                "Crop name must be at least 2 characters long."
            )

        cleaned['crop_name'] = crop_name

    if 'unit' in data:
        unit = str(data['unit']).strip().lower()

        if unit not in VALID_UNITS:
            raise ValidationException(
                f"Invalid unit. Allowed values: {', '.join(VALID_UNITS)}."
            )

        cleaned['unit'] = unit

    if 'quantity' in data:
        cleaned['quantity'] = round(
            float(
                validate_positive_number(
                    data['quantity'],
                    field_name="Quantity"
                )
            ),
            2
        )

    if 'price_per_unit' in data:
        cleaned['price_per_unit'] = round(
            float(
                validate_positive_number(
                    data['price_per_unit'],
                    field_name="Price per unit"
                )
            ),
            2
        )

    if 'quality_notes' in data:
        cleaned['quality_notes'] = str(
            data['quality_notes']
        ).strip()

    if 'status' in data:
        status = str(
            data['status']
        ).strip().upper()

        if status not in ProcurementStatus.ALL:
            raise ValidationException(
                f"Invalid status. Allowed values: "
                f"{', '.join(ProcurementStatus.ALL)}."
            )

        cleaned['status'] = status

    if not cleaned:
        raise ValidationException(
            "No valid fields were provided to update."
        )

    return cleaned