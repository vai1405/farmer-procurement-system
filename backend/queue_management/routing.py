"""
WebSocket URL routing for the queue_management app.
Mounted under /ws/queue/ by config/asgi.py.
"""

from django.urls import re_path

from queue_management.consumers import QueueConsumer

websocket_urlpatterns = [
    re_path(r'^ws/queue/(?P<slot_id>[0-9a-fA-F]{24})/$', QueueConsumer.as_asgi()),
]