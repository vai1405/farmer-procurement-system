"""
Authentication API endpoints.

Every view here is deliberately thin: validate/delegate/respond.
All rules live in accounts/services.py.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from accounts import services
from accounts.permissions import IsAuthenticatedUser
from core.constants import Roles
from core.responses import success_response


class RegisterView(APIView):
    """POST /api/auth/register/ — public farmer self-registration."""

    permission_classes = [AllowAny]

    def post(self, request):
        result = services.register_farmer(request.data)

        return success_response(
            message="Registration successful. Welcome aboard!",
            data=result,
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/ — login for ALL roles.

    Body: { "identifier": "<email or phone>", "password": "..." }

    The response includes the user's role, which the frontend uses to
    redirect to the correct dashboard.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        result = services.login(request.data)

        return success_response(
            message=f"Welcome back, {result['user']['full_name']}!",
            data=result,
        )


class StaffLoginView(APIView):
    """
    POST /api/auth/staff-login/ — dedicated staff/admin login endpoint.

    Functionally the same as LoginView but rejects FARMER accounts, so the
    staff portal cannot be used by farmers even with valid credentials.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        result = services.login(
            request.data,
            allowed_roles=[Roles.STAFF, Roles.ADMIN],
        )

        return success_response(
            message=f"Welcome back, {result['user']['full_name']}!",
            data=result,
        )


class RefreshTokenView(APIView):
    """
    POST /api/auth/refresh/ — exchange a refresh token for a new pair.

    Body: { "refresh": "<refresh token>" }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        result = services.refresh_session(request.data.get('refresh'))

        return success_response(
            message="Session refreshed.",
            data=result,
        )


class LogoutView(APIView):
    """
    POST /api/auth/logout/ — revoke the supplied refresh token.

    Body: { "refresh": "<refresh token>" }
    """

    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        services.logout(request.data.get('refresh'))

        return success_response(message="You have been logged out successfully.")


class CurrentUserView(APIView):
    """
    GET /api/auth/me/ — return the logged-in user's account and profile.

    The frontend calls this on page load to restore the session from a
    stored token without keeping user data in localStorage.
    """

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        result = services.get_current_user(request.user.id)

        return success_response(
            message="User profile retrieved.",
            data=result,
        )
    # ---------------------------------------------------------------------------
# ADMIN-ONLY VIEWS (Step 14)
# ---------------------------------------------------------------------------
from accounts import admin_service  # noqa: E402
from accounts.permissions import IsAdmin  # noqa: E402


class AdminUserListView(APIView):
    """
    GET /api/auth/admin/users/

    System-wide user listing (any role). Query params:
        role (FARMER|STAFF|ADMIN), is_active (true/false), q, page, page_size
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        is_active_param = request.query_params.get('is_active')
        is_active = None
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'

        result = admin_service.list_users(
            role=request.query_params.get('role'),
            is_active=is_active,
            keyword=request.query_params.get('q'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Users retrieved successfully.", data=result)


class AdminUserStatusView(APIView):
    """PUT /api/auth/admin/users/{id}/status/ - activate/deactivate any account."""

    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        user = admin_service.set_user_status(
            user_id, request.data.get('is_active'), request.user,
        )
        status_label = "activated" if user['is_active'] else "deactivated"
        return success_response(message=f"Account {status_label} successfully.", data=user)


class AdminStaffCreateView(APIView):
    """
    POST /api/auth/admin/staff/

    Create a STAFF or ADMIN account. Body matches validate_staff_creation
    from Step 3: full_name, phone, email, password, role.
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        user = admin_service.create_staff_account(request.data, request.user)
        return success_response(
            message=f"{user['role'].title()} account created successfully.",
            data=user,
            status_code=201,
        )


class AdminStaffCentreAssignView(APIView):
    """PUT /api/auth/admin/staff/{user_id}/centre/ - assign a staff member to a centre."""

    permission_classes = [IsAdmin]

    def put(self, request, user_id):
        staff_profile = admin_service.assign_staff_centre(
            user_id, request.data.get('centre_id'),
        )
        return success_response(message="Staff centre assignment updated.", data=staff_profile)