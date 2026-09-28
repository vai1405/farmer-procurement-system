"""
Application-level exceptions.

These are raised by services/repositories and converted into consistent
JSON responses by the DRF exception handler in config/exceptions.py.
"""

from rest_framework import status


class AppException(Exception):
    """Base class for all handled application errors."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "An unexpected error occurred."

    def __init__(self, message=None, status_code=None):
        self.message = message or self.default_message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.message)


class ValidationException(AppException):
    """Raised when incoming request data fails validation."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "Invalid input data."


class NotFoundException(AppException):
    """Raised when a requested document does not exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "The requested resource was not found."


class AuthenticationException(AppException):
    """Raised for login failures, invalid or expired tokens."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Authentication failed."


class PermissionException(AppException):
    """Raised when an authenticated user lacks the required role."""
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "You do not have permission to perform this action."


class ConflictException(AppException):
    """
    Raised for business-rule conflicts:
    duplicate registration, duplicate booking, slot already full.
    """
    status_code = status.HTTP_409_CONFLICT
    default_message = "This action conflicts with the current state."


class DatabaseException(AppException):
    """Raised when a database operation fails."""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_message = "A database error occurred. Please try again later."