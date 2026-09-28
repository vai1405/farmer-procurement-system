"""
Notification API endpoints. Every route is scoped to the authenticated
user — nobody can list or modify another user's notifications.
"""

from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedUser
from core.responses import success_response
from notifications import services


class NotificationListView(APIView):
    """
    GET /api/notifications/

    Query params: unread_only ("true"/"false"), page, page_size
    """

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        unread_only = request.query_params.get('unread_only', '').lower() == 'true'

        result = services.list_notifications(
            user_id=request.user.object_id,
            unread_only=unread_only,
            page=int(request.query_params.get('page', 1)),
            page_size=int(request.query_params.get('page_size', 20)),
        )
        return success_response(message="Notifications retrieved.", data=result)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — lightweight count for the navbar bell."""

    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        count = services.get_unread_count(request.user.object_id)
        return success_response(
            message="Unread count retrieved.",
            data={'unread_count': count},
        )


class NotificationMarkReadView(APIView):
    """PUT /api/notifications/{id}/read/ — mark one notification as read."""

    permission_classes = [IsAuthenticatedUser]

    def put(self, request, notification_id):
        notification = services.mark_as_read(request.user.object_id, notification_id)
        return success_response(message="Notification marked as read.", data=notification)


class NotificationMarkAllReadView(APIView):
    """PUT /api/notifications/read-all/ — mark every notification as read."""

    permission_classes = [IsAuthenticatedUser]

    def put(self, request):
        result = services.mark_all_as_read(request.user.object_id)
        return success_response(
            message=f"{result['marked_count']} notification(s) marked as read.",
            data=result,
        )