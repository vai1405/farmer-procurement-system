"""
Validation for authentication payloads.

Each function returns a CLEANED dictionary. Views never touch raw
request data directly — they pass it through here first.
"""

from core.constants import Roles
from core.validators import (
    validate_choice,
    validate_email,
    validate_password,
    validate_phone,
    validate_required,
)

# Registration fields required by the project specification (Section 4).
FARMER_REGISTRATION_FIELDS = [
    'full_name', 'phone', 'email', 'password',
    'address', 'village', 'district', 'state',
]


def validate_registration(data):
    """
    Validate and clean a farmer registration payload.

    Returns:
        dict with keys: full_name, phone, email, password,
                        address, village, district, state
    """
    validate_required(data, FARMER_REGISTRATION_FIELDS)

    full_name = str(data['full_name']).strip()
    if len(full_name) < 3:
        from core.exceptions import ValidationException
        raise ValidationException("Full name must be at least 3 characters long.")

    return {
        'full_name': full_name,
        'phone': validate_phone(data['phone']),
        'email': validate_email(data['email']),
        'password': validate_password(data['password']),
        'address': str(data['address']).strip(),
        'village': str(data['village']).strip(),
        'district': str(data['district']).strip(),
        'state': str(data['state']).strip(),
    }


def validate_login(data):
    """
    Validate a login payload.

    `identifier` may be an email address or a phone number, so we do not
    run format validation on it here — we simply require it to be present.
    Doing strict validation would leak information about which accounts
    exist.
    """
    validate_required(data, ['identifier', 'password'])

    return {
        'identifier': str(data['identifier']).strip(),
        'password': str(data['password']),
    }


def validate_staff_creation(data):
    """
    Validate an admin-created STAFF or ADMIN account payload.
    Used by the admin module (Step 14) and the seed command.
    """
    validate_required(
        data,
        ['full_name', 'phone', 'email', 'password', 'role']
    )

    return {
        'full_name': str(data['full_name']).strip(),
        'phone': validate_phone(data['phone']),
        'email': validate_email(data['email']),
        'password': validate_password(data['password']),
        'role': validate_choice(
            str(data['role']).upper(),
            [Roles.STAFF, Roles.ADMIN],
            field_name="role",
        ),
    }


def validate_status_update(data):
    """Validate an activate/deactivate payload for any user account."""
    from core.exceptions import ValidationException

    if 'is_active' not in data:
        raise ValidationException("is_active is required.")

    return {'is_active': bool(data['is_active'])}