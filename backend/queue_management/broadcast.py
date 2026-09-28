"""
Helper for pushing queue updates to connected WebSocket clients.

Called from services.py after any event that changes a slot's queue
state: a booking is created, cancelled, or a farmer is called.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from queue_management.consumers import slot_group_name


def broadcast_queue_update(slot_id, queue_data):
    """
    Push a queue.update event to every client watching this slot.

    Args:
        slot_id: the slot's id (str or ObjectId — stringified internally).
        queue_data: the full queue status payload (same shape as
            GET /api/queue/status/), so every client can replace its
            entire view with one message rather than patching partial state.

    Uses async_to_sync because our service layer is synchronous (PyMongo),
    while the channel layer's group_send is an async API.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        # Channel layer not configured (e.g. Redis down) — degrade
        # gracefully rather than crashing the booking/queue flow.
        return

    async_to_sync(channel_layer.group_send)(
        slot_group_name(str(slot_id)),
        {
            'type': 'queue.update',  # -> consumers.QueueConsumer.queue_update
            'data': queue_data,
        },
    )