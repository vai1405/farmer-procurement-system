"""
ASGI config for the Smart Farmer Procurement & Queue Management System.

Routes HTTP requests through Django as normal, and WebSocket connections
through Django Channels with our custom JWT auth middleware. Two
WebSocket route groups are mounted: queue updates (Step 9) and
notifications (Step 12).
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.core.asgi import get_asgi_application  # noqa: E402

django_asgi_app = get_asgi_application()

from notifications.routing import websocket_urlpatterns as notification_ws_patterns  # noqa: E402
from queue_management.channels_auth import JWTAuthMiddlewareStack  # noqa: E402
from queue_management.routing import websocket_urlpatterns as queue_ws_patterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(queue_ws_patterns + notification_ws_patterns)
    ),
})