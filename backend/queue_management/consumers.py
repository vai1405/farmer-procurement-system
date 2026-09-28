"""
WebSocket consumer for live queue updates.

Connection URL: ws://host/ws/queue/<slot_id>/?token=<access_token>

Protocol (server -> client only; this is a read-only push channel):
    On connect:
        { "type": "queue.snapshot", "data": <queue status, same shape as
          GET /api/queue/status/> }
    On any queue change (booking created/cancelled, call-next):
        { "type": "queue.update", "data": <same shape> }

Every connection joins the Channels group "slot_queue_<slot_id>", so a
message sent to that group (from queue_management/services.py) reaches
every farmer and staff member currently watching that slot.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer

from asgiref.sync import sync_to_async


def slot_group_name(slot_id):
    """Channels group names may only contain letters, digits, '.', '-', '_'."""
    return f"slot_queue_{slot_id}"


class QueueConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.slot_id = self.scope['url_route']['kwargs']['slot_id']
        self.group_name = slot_group_name(self.slot_id)
        user = self.scope.get('user')

        # Reject unauthenticated connections outright — mirrors the REST
        # API's requirement that queue status needs an authenticated user.
        if user is None:
            await self.close(code=4401)  # custom code: unauthenticated
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send an immediate snapshot so the client has data before the
        # next broadcast happens, instead of waiting for the first change.
        snapshot = await self._get_queue_snapshot()
        if snapshot is not None:
            await self.send(text_data=json.dumps({
                'type': 'queue.snapshot',
                'data': snapshot,
            }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """
        This channel is read-only from the client's perspective — staff
        actions go through the REST API (POST /api/queue/call-next/),
        not through the socket. We only handle a lightweight ping so the
        frontend can verify the connection is alive if it chooses to.
        """
        if text_data:
            try:
                message = json.loads(text_data)
            except json.JSONDecodeError:
                return

            if message.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

    # -----------------------------------------------------------------
    # Group event handler — the method name MUST match the "type" field
    # (with dots converted to underscores) sent via group_send in
    # services.py: "queue.update" -> queue_update
    # -----------------------------------------------------------------
    async def queue_update(self, event):
        """Forward a broadcasted queue-update event to this socket."""
        await self.send(text_data=json.dumps({
            'type': 'queue.update',
            'data': event['data'],
        }))

    @sync_to_async
    def _get_queue_snapshot(self):
        """Fetch the current queue status synchronously (PyMongo is sync)."""
        from queue_management.services import get_queue_status
        from core.exceptions import AppException

        try:
            return get_queue_status(self.slot_id)
        except AppException:
            return None