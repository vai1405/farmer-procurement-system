"""
Booking API endpoints.

Queue-control endpoints (call-next, queue status) are added in Step 8
within this same app — bookings and queue movement are two facets of one
domain.
"""

from rest_framework.views import APIView

from accounts.permissions import IsFarmer, IsStaffOrAdmin
from core.responses import success_response
from queue_management import services


# ---------------------------------------------------------------------------
# BOOKING VIEWS
# ---------------------------------------------------------------------------

class BookingListCreateView(APIView):
    """
    GET  /api/bookings/       - list the authenticated farmer's bookings
    POST /api/bookings/       - book a slot

    Query params for GET:
        status - comma-separated status filter, e.g. "BOOKED,WAITING"
    """

    permission_classes = [IsFarmer]

    def get(self, request):
        status_param = request.query_params.get('status')
        status_list = status_param.split(',') if status_param else None

        bookings = services.list_my_bookings(
            request.user,
            status_list
        )

        return success_response(
            message="Bookings retrieved successfully.",
            data={'bookings': bookings},
        )

    def post(self, request):
        booking = services.create_booking(
            request.user,
            request.data
        )

        return success_response(
            message="Slot booked successfully.",
            data=booking,
            status_code=201,
        )


class BookingDetailView(APIView):
    """
    GET /api/bookings/{id}/
    Fetch one booking belonging to the farmer.
    """

    permission_classes = [IsFarmer]

    def get(self, request, booking_id):
        booking = services.get_booking(
            request.user,
            booking_id
        )

        return success_response(
            message="Booking retrieved successfully.",
            data=booking
        )


class BookingCancelView(APIView):
    """
    PUT /api/bookings/{id}/cancel/

    Body (optional):
        {
            "reason": "..."
        }
    """

    permission_classes = [IsFarmer]

    def put(self, request, booking_id):
        reason = request.data.get('reason')

        booking = services.cancel_booking(
            request.user,
            booking_id,
            reason
        )

        return success_response(
            message="Booking cancelled successfully.",
            data=booking,
        )


# ---------------------------------------------------------------------------
# QUEUE VIEWS
# ---------------------------------------------------------------------------

class QueueStatusView(APIView):
    """
    GET /api/queue/status/

    Returns the current queue status for a slot.

    Expected query parameter:
        slot_id=<slot_id>
    """

    permission_classes = [IsFarmer]

    def get(self, request):
        slot_id = request.query_params.get('slot_id')

        if not slot_id:
            return success_response(
                message="slot_id is required.",
                data={},
                status_code=400,
            )

        queue_status = services.get_queue_status(slot_id)

        return success_response(
            message="Queue status retrieved successfully.",
            data=queue_status,
        )


class QueueCallNextView(APIView):
    """
    POST /api/queue/call-next/

    Calls the next farmer in the queue.

    Expected body:
        {
            "slot_id": "<slot_id>"
        }
    """

    permission_classes = [IsStaffOrAdmin]

    def post(self, request):
        slot_id = request.data.get('slot_id')

        if not slot_id:
            return success_response(
                message="slot_id is required.",
                data={},
                status_code=400,
            )

        result = services.call_next(slot_id)

        return success_response(
            message="Next farmer called successfully.",
            data=result,
        )