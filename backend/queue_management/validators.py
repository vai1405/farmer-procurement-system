"""
Validation for booking-related payloads.
"""

from core.exceptions import ValidationException
from core.validators import validate_object_id, validate_required


def validate_booking_create(data):
    """Validate a new booking request. A booking only needs a slot_id —
    the farmer is taken from the authenticated request, never the body."""
    validate_required(data, ['slot_id'])
    return {'slot_id': validate_object_id(data['slot_id'], field_name="slot")}