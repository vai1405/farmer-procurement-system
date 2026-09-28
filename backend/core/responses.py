"""
Helpers that enforce the project-wide API response format.

SUCCESS:  { "success": true,  "message": "...", "data": {...} }
ERROR:    { "success": false, "message": "..." }

Every view in this project returns one of these — never a bare Response().
"""

from rest_framework import status
from rest_framework.response import Response


def success_response(message="Success.", data=None, status_code=status.HTTP_200_OK):
    """
    Build a standard success response.

    Args:
        message: Human-readable message shown to the user.
        data: Payload dict/list, or None for operations with no return body.
        status_code: HTTP status code (200 by default, 201 for creation).
    """
    payload = {
        'success': True,
        'message': message,
    }

    # Always include the key so the frontend can rely on its presence.
    payload['data'] = data if data is not None else {}

    return Response(payload, status=status_code)


def error_response(message="An error occurred.", status_code=status.HTTP_400_BAD_REQUEST):
    """
    Build a standard error response.

    Note: we deliberately do NOT include a 'data' key or stack traces here,
    to avoid leaking internal details to the client.
    """
    return Response(
        {
            'success': False,
            'message': message,
        },
        status=status_code,
    )