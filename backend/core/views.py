"""
Health-check endpoints used to verify the system is wired up correctly.
Kept public (no auth) because they expose no sensitive data.
"""

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from core.mongo import get_database, ping
from core.responses import error_response, success_response


class HealthView(APIView):
    """GET /api/health/ — confirms the Django backend is running."""

    permission_classes = [AllowAny]

    def get(self, request):
        return success_response(
            message="Hello from Django backend! Connection successful.",
            data={'service': 'farmer-procurement-backend', 'status': 'running'},
        )


class DatabaseHealthView(APIView):
    """GET /api/db-health/ — confirms MongoDB is reachable."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not ping():
            return error_response(
                message="MongoDB is not reachable. Check that the server is running.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Anonymous health checks confirm connectivity only.
        # Database/schema details are returned only to authenticated users.
        data = {'status': 'connected'}

        if request.user.is_authenticated:
            database = get_database()
            data['database'] = settings.MONGO_DB_NAME
            data['collections'] = sorted(database.list_collection_names())

        return success_response(
            message="MongoDB connection successful.",
            data=data,
        )