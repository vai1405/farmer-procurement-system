"""
Input validation helpers shared across all modules.

Each validator either returns a cleaned value or raises ValidationException,
which the DRF exception handler turns into a 400 response with a clear message.
"""

import re
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId

from core.exceptions import ValidationException

EMAIL_PATTERN = re.compile(r'^[\w\.\+\-]+@[\w\-]+\.[\w\.\-]+$')
# Indian mobile numbers: 10 digits starting 6-9, optional +91 prefix.
PHONE_PATTERN = re.compile(r'^(\+91)?[6-9]\d{9}$')


def validate_required(data, fields):
    """
    Ensure every field in `fields` is present and non-empty in `data`.

    Raises:
        ValidationException naming the first missing field.
    """
    for field in fields:
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            readable = field.replace('_', ' ').capitalize()
            raise ValidationException(f"{readable} is required.")


def validate_object_id(value, field_name="ID"):
    """
    Validate and convert a string into an ObjectId.

    Returns:
        ObjectId

    Raises:
        ValidationException if the value is not a valid 24-character hex ID.
    """
    if isinstance(value, ObjectId):
        return value

    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError, ValueError):
        raise ValidationException(f"Invalid {field_name} provided.")


def validate_email(value):
    """Validate and normalize an email address (lowercased, trimmed)."""
    email = str(value).strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValidationException("Please enter a valid email address.")
    return email


def validate_phone(value):
    """Validate a phone number and return it stripped of spaces/dashes."""
    phone = re.sub(r'[\s\-]', '', str(value))
    if not PHONE_PATTERN.match(phone):
        raise ValidationException(
            "Please enter a valid 10-digit mobile number."
        )
    return phone


def validate_password(value):
    """
    Enforce a minimum password policy.
    Kept intentionally simple so demo users can log in easily,
    while still rejecting obviously weak passwords.
    """
    password = str(value)
    if len(password) < 6:
        raise ValidationException("Password must be at least 6 characters long.")
    if password.isdigit():
        raise ValidationException("Password cannot be entirely numeric.")
    return password


def validate_choice(value, choices, field_name="value"):
    """Ensure `value` is one of the allowed `choices`."""
    if value not in choices:
        allowed = ", ".join(choices)
        raise ValidationException(
            f"Invalid {field_name}. Allowed values: {allowed}."
        )
    return value


def validate_positive_number(value, field_name="value", allow_zero=False):
    """Validate that a value is a number greater than zero (or >= 0)."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValidationException(f"{field_name} must be a valid number.")

    if allow_zero and number < 0:
        raise ValidationException(f"{field_name} cannot be negative.")
    if not allow_zero and number <= 0:
        raise ValidationException(f"{field_name} must be greater than zero.")

    return number


def validate_date_string(value, field_name="date", fmt="%Y-%m-%d"):
    """
    Parse a date string (default format YYYY-MM-DD) into a datetime object.

    Storing dates as datetime (not strings) in MongoDB lets us use range
    queries and sorting correctly.
    """
    try:
        return datetime.strptime(str(value).strip(), fmt)
    except (ValueError, TypeError):
        raise ValidationException(
            f"Invalid {field_name}. Expected format: YYYY-MM-DD."
        )


def validate_time_string(value, field_name="time", fmt="%H:%M"):
    """Validate a 24-hour time string such as '09:30' and return it normalized."""
    try:
        parsed = datetime.strptime(str(value).strip(), fmt)
    except (ValueError, TypeError):
        raise ValidationException(
            f"Invalid {field_name}. Expected 24-hour format, e.g. 09:00."
        )
    return parsed.strftime(fmt)