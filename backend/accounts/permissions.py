"""
Role-based permission classes.

Usage in a view:
    class CentreCreateView(APIView):
        permission_classes = [IsStaffOrAdmin]

DRF calls has_permission() before the view body runs, so an unauthorized
request never reaches business logic.
"""

from rest_framework.permissions import BasePermission

from core.constants import Roles


class IsAuthenticatedUser(BasePermission):
    """Allow any successfully authenticated user, regardless of role."""

    message = "Authentication is required to access this resource."

    def has_permission(self, request, view):
        return request.user is not None and getattr(
            request.user, 'is_authenticated', False
        )


class RoleRequiredPermission(IsAuthenticatedUser):
    """Base class: allow only users whose role is in `allowed_roles`."""

    allowed_roles = []
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in self.allowed_roles


class IsFarmer(RoleRequiredPermission):
    allowed_roles = [Roles.FARMER]
    message = "This action is available to farmers only."


class IsStaff(RoleRequiredPermission):
    allowed_roles = [Roles.STAFF]
    message = "This action is available to procurement staff only."


class IsAdmin(RoleRequiredPermission):
    allowed_roles = [Roles.ADMIN]
    message = "This action is available to administrators only."


class IsStaffOrAdmin(RoleRequiredPermission):
    """
    The most commonly used permission in this project — centre, slot,
    queue, procurement, and payment management all require it.
    """
    allowed_roles = [Roles.STAFF, Roles.ADMIN]
    message = "This action is available to staff and administrators only."