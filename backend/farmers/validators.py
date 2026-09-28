"""
Validation for farmer profile updates.

Note what is NOT editable here: email, role, and password. Changing an
email would affect login identity, so it is deliberately excluded from
this endpoint — a separate, verified flow would be required in a real
system.
"""

from core.exceptions import ValidationException
from core.validators import validate_phone

# Fields a farmer is allowed to change about themselves.
EDITABLE_PROFILE_FIELDS = ['full_name', 'phone', 'address', 'village', 'district', 'state']


def validate_profile_update(data):
    """
    Validate a profile-update payload.

    Only fields actually present in the request are validated and returned,
    so the endpoint supports partial updates.

    Raises:
        ValidationException if no editable field was supplied, or if a
        supplied value is invalid.
    """
    cleaned = {}

    if 'full_name' in data:
        full_name = str(data['full_name']).strip()
        if len(full_name) < 3:
            raise ValidationException("Full name must be at least 3 characters long.")
        cleaned['full_name'] = full_name

    if 'phone' in data:
        cleaned['phone'] = validate_phone(data['phone'])

    for field in ['address', 'village', 'district', 'state']:
        if field in data:
            value = str(data[field]).strip()
            if not value:
                readable = field.capitalize()
                raise ValidationException(f"{readable} cannot be empty.")
            cleaned[field] = value

    if not cleaned:
        raise ValidationException("No valid fields were provided to update.")

    return cleaned