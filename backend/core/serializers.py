"""
Converts raw MongoDB documents into JSON-serializable dictionaries.

Handles:
  - _id (ObjectId)        -> id (string)
  - nested ObjectId values -> strings
  - datetime values        -> ISO 8601 strings
  - field exclusion        -> e.g. never send 'password' to the client
"""

from datetime import date, datetime
from decimal import Decimal

from bson import ObjectId

# Fields that must NEVER be returned in an API response.
SENSITIVE_FIELDS = {'password', 'password_hash'}


def _convert_value(value):
    """Recursively convert a single value into a JSON-safe form."""
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {key: _convert_value(val) for key, val in value.items()}

    if isinstance(value, list):
        return [_convert_value(item) for item in value]

    return value


def serialize_document(document, exclude=None):
    """
    Convert a single MongoDB document to a JSON-safe dict.

    The '_id' key is renamed to 'id' so the frontend works with a
    conventional field name.

    Args:
        document: raw dict returned by PyMongo, or None.
        exclude: optional iterable of extra field names to remove.

    Returns:
        dict, or None if document was None.
    """
    if document is None:
        return None

    excluded = set(SENSITIVE_FIELDS)
    if exclude:
        excluded.update(exclude)

    result = {}

    for key, value in document.items():
        if key in excluded:
            continue

        if key == '_id':
            result['id'] = str(value)
        else:
            result[key] = _convert_value(value)

    return result


def serialize_documents(documents, exclude=None):
    """Convert a list/cursor of MongoDB documents to a list of JSON-safe dicts."""
    return [serialize_document(doc, exclude=exclude) for doc in documents]