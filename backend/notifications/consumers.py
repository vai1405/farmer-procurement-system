"""
WebSocket consumer for live notification delivery.

Connection URL: ws://host/ws/notifications/?token=<access_token>

Each connection joins a group unique to that user — "user_notifications_
<user_id>" — so notify() (notifications/services.py) can push directly
to exactly the right person, regardless of which page they're on.

Protocol (server -> client only):
    On connect:
        { "type": "notification.snapshot", "data": { unread_count } }
    On a new notification:
        { "type": "notification.new", "data": <serialized notification> }
"""

import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from notifications.broadcast import user_group_name


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')

        if user is None:
            await self.close(code=4401)
            return

        self.user_id = str(user['_id'])
        self.group_name = user_group_name(self.user_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        unread_count = await self._get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'notification.snapshot',
            'data': {'unread_count': unread_count},
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """Read-only channel from the client's side — accepts only a ping."""
        if text_data:
            try:
                message = json.loads(text_data)
            except json.JSONDecodeError:
                return
            if message.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

    async def notification_new(self, event):
        """Forward a broadcasted new-notification event to this socket."""
        await self.send(text_data=json.dumps({
            'type': 'notification.new',
            'data': event['data'],
        }))

    @sync_to_async
    def _get_unread_count(self):
        from notifications.services import get_unread_count
        from bson import ObjectId
        return get_unread_count(ObjectId(self.user_id))