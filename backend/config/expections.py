"""
Global DRF exception handler.

Converts every exception into the project's standard error format:
    { "success": false, "message": "..." }

Handles three categories:
  1. Our own AppException subclasses -> use their message + status code.
  2. PyMongo errors                  -> generic 503, details logged not exposed.
  3. Standard DRF exceptions         -> reshaped into our format.
Anything else bubbles up as a 500 with a generic message (no stack traces
are ever sent to the client).
"""

import logging

from pymongo.errors import DuplicateKeyError, PyMongoError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from core.exceptions import AppException

logger = logging.getLogger(__name__)


def _build(message, status_code):
    return Response({'success': False, 'message': message}, status=status_code)


def _extract_drf_message(data):
    """Pull the most useful human-readable message out of a DRF error body."""
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        for value in data.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
    elif isinstance(data, list) and data:
        return str(data[0])

    return "An error occurred."


def custom_exception_handler(exc, context):
    # 1. Our own application exceptions -------------------------------------
    if isinstance(exc, AppException):
        return _build(exc.message, exc.status_code)

    # 2. Database errors -----------------------------------------------------
    if isinstance(exc, DuplicateKeyError):
        logger.warning("Duplicate key error: %s", exc)
        return _build(
            "This record already exists.",
            status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, PyMongoError):
        logger.error("Database error: %s", exc, exc_info=True)
        return _build(
            "A database error occurred. Please try again later.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # 3. Standard DRF exceptions --------------------------------------------
    response = drf_exception_handler(exc, context)
    if response is not None:
        return _build(_extract_drf_message(response.data), response.status_code)

    # 4. Anything unexpected -------------------------------------------------
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return _build(
        "An internal server error occurred.",
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    )