"""
Farmer profile and dashboard endpoints.

All routes here require an authenticated FARMER. Staff and admin access
farmer data through their own module (Step 13), with different rules.
"""

from rest_framework.views import APIView

from accounts.permissions import IsFarmer
from core.responses import success_response
from farmers import dashboard_service, services


class ProfileView(APIView):
    """
    GET  /api/farmers/profile/  - fetch the logged-in farmer's profile
    PUT  /api/farmers/profile/  - update it (partial updates supported)
    """

    permission_classes = [IsFarmer]

    def get(self, request):
        profile = services.get_profile(request.user.id)

        return success_response(
            message="Profile retrieved successfully.",
            data=profile,
        )

    def put(self, request):
        profile = services.update_profile(request.user.id, request.data)

        return success_response(
            message="Profile updated successfully.",
            data=profile,
        )


class DashboardView(APIView):
    """
    GET /api/farmers/dashboard/ - all dashboard data in one request.

    Returns booking, queue, procurement, payment, and statistics sections.
    Sections whose underlying feature has no data yet return structured
    empty values rather than being omitted, so the frontend can render
    consistent cards without conditional key checks.
    """

    permission_classes = [IsFarmer]

    def get(self, request):
        data = dashboard_service.get_dashboard(request.user.id)

        return success_response(
            message="Dashboard data retrieved successfully.",
            data=data,
        )
    # ---------------------------------------------------------------------------
# STAFF-FACING VIEWS (Step 13)
# ---------------------------------------------------------------------------
from accounts.permissions import IsStaffOrAdmin  # noqa: E402
from farmers import staff_dashboard_service  # noqa: E402


class StaffDashboardView(APIView):
    """
    GET /api/farmers/staff-dashboard/

    Staff/admin operational overview: today's bookings, live queue
    summaries across all active slots, procurement and payment volume.
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        data = staff_dashboard_service.get_staff_dashboard()
        return success_response(message="Staff dashboard data retrieved.", data=data)


class FarmerDirectoryView(APIView):
    """
    GET /api/farmers/directory/

    Paginated, searchable farmer listing for staff. Query params:
        q         - search keyword (name, phone, or village)
        page, page_size
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        result = staff_dashboard_service.list_farmers(
            keyword=request.query_params.get('q'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Farmer directory retrieved.", data=result)


class FarmerDetailView(APIView):
    """GET /api/farmers/directory/{farmer_id}/ - one farmer's profile + recent bookings."""

    permission_classes = [IsStaffOrAdmin]

    def get(self, request, farmer_id):
        data = staff_dashboard_service.get_farmer_detail(farmer_id)
        return success_response(message="Farmer details retrieved.", data=data)
    # ---------------------------------------------------------------------------
# ADMIN REPORTS (Step 14)
# ---------------------------------------------------------------------------
from accounts.permissions import IsAdmin  # noqa: E402
from farmers import reports_service  # noqa: E402


class SystemReportView(APIView):
    """
    GET /api/farmers/reports/

    Admin-only system-wide report. Query params: date_from, date_to
    (both optional — omitting both gives an all-time report).
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        data = reports_service.get_system_report(
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
        )
        return success_response(message="System report generated.", data=data)