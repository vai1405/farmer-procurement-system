"""
Procurement centre API endpoints.

Read access (GET) is available to any authenticated user, since farmers
need to browse centres to book a slot (Step 6). Write access (POST, PUT,
DELETE, status toggle) is restricted to staff and admin.
"""

from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedUser, IsStaffOrAdmin
from core.responses import success_response
from procurement import services


class CentreListCreateView(APIView):
    """
    GET  /api/centres/  - list centres (paginated, searchable)
    POST /api/centres/  - create a centre (staff/admin only)

    Query params for GET:
        q         - search keyword (matches name or location)
        is_active - "true" / "false" to filter by status
        page      - page number (default 1)
        page_size - results per page (default 20)
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsStaffOrAdmin()]
        return [IsAuthenticatedUser()]

    def get(self, request):
        keyword = request.query_params.get('q')

        is_active_param = request.query_params.get('is_active')
        is_active = None
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        result = services.list_centres(keyword, is_active, page, page_size)

        return success_response(
            message="Centres retrieved successfully.",
            data=result,
        )

    def post(self, request):
        centre = services.create_centre(request.data)

        return success_response(
            message="Procurement centre created successfully.",
            data=centre,
            status_code=201,
        )


class CentreActiveListView(APIView):
    """
    GET /api/centres/active/ - lightweight list of active centres only.

    Used by the farmer's slot-booking flow (Step 6) to populate a centre
    picker without pagination noise.
    """

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        centres = services.get_active_centres()

        return success_response(
            message="Active centres retrieved successfully.",
            data={'centres': centres},
        )


class CentreDetailView(APIView):
    """
    GET    /api/centres/{id}/ - fetch a single centre
    PUT    /api/centres/{id}/ - update a centre (staff/admin only)
    DELETE /api/centres/{id}/ - delete a centre (staff/admin only)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticatedUser()]
        return [IsStaffOrAdmin()]

    def get(self, request, centre_id):
        centre = services.get_centre(centre_id)
        return success_response(message="Centre retrieved successfully.", data=centre)

    def put(self, request, centre_id):
        centre = services.update_centre(centre_id, request.data)
        return success_response(message="Centre updated successfully.", data=centre)

    def delete(self, request, centre_id):
        services.delete_centre(centre_id)
        return success_response(message="Centre deleted successfully.")


class CentreStatusView(APIView):
    """
    PUT /api/centres/{id}/status/ - activate or deactivate a centre.

    Body: { "is_active": true }

    Kept as a separate endpoint (rather than folding into the general
    update) so the frontend toggle can fire a single, explicit, low-risk
    request instead of resending the whole centre form.
    """

    permission_classes = [IsStaffOrAdmin]

    def put(self, request, centre_id):
        from core.exceptions import ValidationException

        if 'is_active' not in request.data:
            raise ValidationException("is_active is required.")

        centre = services.set_centre_status(centre_id, request.data['is_active'])

        status_label = "activated" if centre['is_active'] else "deactivated"
        return success_response(
            message=f"Centre {status_label} successfully.",
            data=centre,
        )
    # ---------------------------------------------------------------------------
# SLOT ENDPOINTS
# ---------------------------------------------------------------------------


class SlotListCreateView(APIView):
    """
    GET  /api/slots/  - list slots (paginated, filterable) — staff/admin
    POST /api/slots/  - create a slot — staff/admin only

    Query params for GET:
        centre_id, date_from, date_to, status (ACTIVE|INACTIVE), page, page_size
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        result = services.list_slots(
            centre_id=request.query_params.get('centre_id'),
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
            status=request.query_params.get('status'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Slots retrieved successfully.", data=result)

    def post(self, request):
        slot = services.create_slot(request.data)
        return success_response(
            message="Procurement slot created successfully.",
            data=slot,
            status_code=201,
        )


class SlotAvailableView(APIView):
    """
    GET /api/slots/available/?centre_id=<id>

    Farmer-facing: active, non-full, upcoming slots for a given centre.
    This is the endpoint the "Book Slot" page (Step 7) will call first.
    """

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        from core.exceptions import ValidationException

        centre_id = request.query_params.get('centre_id')
        if not centre_id:
            raise ValidationException("centre_id query parameter is required.")

        result = services.get_available_slots(centre_id)
        return success_response(
            message="Available slots retrieved successfully.",
            data=result,
        )


class SlotDetailView(APIView):
    """
    GET    /api/slots/{id}/ - fetch a slot (any authenticated user)
    PUT    /api/slots/{id}/ - update a slot (staff/admin only)
    DELETE /api/slots/{id}/ - delete a slot (staff/admin only)
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticatedUser()]
        return [IsStaffOrAdmin()]

    def get(self, request, slot_id):
        slot = services.get_slot(slot_id)
        return success_response(message="Slot retrieved successfully.", data=slot)

    def put(self, request, slot_id):
        slot = services.update_slot(slot_id, request.data)
        return success_response(message="Slot updated successfully.", data=slot)

    def delete(self, request, slot_id):
        services.delete_slot(slot_id)
        return success_response(message="Slot deleted successfully.")


class SlotStatusView(APIView):
    """PUT /api/slots/{id}/status/ - activate or deactivate a slot."""

    permission_classes = [IsStaffOrAdmin]

    def put(self, request, slot_id):
        from core.exceptions import ValidationException

        if 'is_active' not in request.data:
            raise ValidationException("is_active is required.")

        slot = services.set_slot_status(slot_id, request.data['is_active'])

        status_label = "activated" if slot['is_active'] else "deactivated"
        return success_response(message=f"Slot {status_label} successfully.", data=slot)
    # ---------------------------------------------------------------------------
# PROCUREMENT ENDPOINTS (Step 10)
# ---------------------------------------------------------------------------


class ProcurementListCreateView(APIView):
    """
    GET  /api/procurement/  - list procurement records (staff/admin, paginated)
    POST /api/procurement/  - record a new procurement (staff/admin only)

    Query params for GET:
        centre_id, farmer_id, status, date_from, date_to, page, page_size
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        result = services.list_procurements(
            centre_id=request.query_params.get('centre_id'),
            farmer_id=request.query_params.get('farmer_id'),
            status=request.query_params.get('status'),
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Procurement records retrieved.", data=result)

    def post(self, request):
        procurement = services.create_procurement(request.data)
        return success_response(
            message="Procurement recorded successfully.",
            data=procurement,
            status_code=201,
        )


class ProcurementDetailView(APIView):
    """
    GET /api/procurement/{id}/ - fetch one record (staff/admin)
    PUT /api/procurement/{id}/ - update a record, including status (staff/admin)
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request, procurement_id):
        procurement = services.get_procurement(procurement_id)
        return success_response(message="Procurement record retrieved.", data=procurement)

    def put(self, request, procurement_id):
        procurement = services.update_procurement(procurement_id, request.data)
        return success_response(message="Procurement record updated.", data=procurement)


class ProcurementByBookingView(APIView):
    """
    GET /api/procurement/by-booking/{booking_id}/

    Used by the staff Queue Control screen to check whether a called
    farmer already has a procurement record, before showing the
    "Record Procurement" form (avoiding an accidental duplicate).
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request, booking_id):
        procurement = services.get_procurement_by_booking(booking_id)
        return success_response(
            message="Procurement lookup complete.",
            data={'procurement': procurement},
        )
    