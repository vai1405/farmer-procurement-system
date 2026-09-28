"""
WebSocket URL routing for the notifications app.
Mounted under /ws/notifications/ by config/asgi.py.
"""

from django.urls import re_path

from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r'^ws/notifications/$', NotificationConsumer.as_asgi()),
]
