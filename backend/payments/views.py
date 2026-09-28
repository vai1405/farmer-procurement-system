"""
Payment API endpoints.

Staff/admin create and manage payment records. Farmers have read-only
access to their own payment history.
"""

from rest_framework.views import APIView

from accounts.permissions import IsFarmer, IsStaffOrAdmin
from core.responses import success_response
from payments import services


class PaymentListCreateView(APIView):
    """
    GET  /api/payments/  - list payment records (staff/admin, paginated)
    POST /api/payments/  - create a payment record (staff/admin only)

    Query params for GET: centre_id, status, page, page_size
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request):
        result = services.list_payments(
            centre_id=request.query_params.get('centre_id'),
            status=request.query_params.get('status'),
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Payment records retrieved.", data=result)

    def post(self, request):
        payment = services.create_payment(request.data)
        return success_response(
            message="Payment record created successfully.",
            data=payment,
            status_code=201,
        )


class PaymentDetailView(APIView):
    """
    GET /api/payments/{id}/ - fetch one record (staff/admin)
    PUT /api/payments/{id}/ - update status / method / transaction ID
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request, payment_id):
        payment = services.get_payment(payment_id)
        return success_response(message="Payment record retrieved.", data=payment)

    def put(self, request, payment_id):
        payment = services.update_payment(payment_id, request.data)
        return success_response(message="Payment record updated.", data=payment)


class PaymentByProcurementView(APIView):
    """
    GET /api/payments/by-procurement/{procurement_id}/

    Used by staff to check whether a completed procurement already has a
    payment record before showing the "Create Payment" form.
    """

    permission_classes = [IsStaffOrAdmin]

    def get(self, request, procurement_id):
        payment = services.get_payment_by_procurement(procurement_id)
        return success_response(
            message="Payment lookup complete.",
            data={'payment': payment},
        )


class MyPaymentsView(APIView):
    """GET /api/payments/my/ - the authenticated farmer's own payment history."""

    permission_classes = [IsFarmer]

    def get(self, request):
        payments = services.list_my_payments(request.user)
        return success_response(
            message="Payment history retrieved.",
            data={'payments': payments},
        )