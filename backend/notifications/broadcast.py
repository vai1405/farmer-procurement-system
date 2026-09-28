"""
Pushes a newly-created notification to the recipient's personal
WebSocket group, mirroring queue_management/broadcast.py from Step 9.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def user_group_name(user_id):
    """Channels group name for one user's personal notification channel."""
    return f"user_notifications_{user_id}"


def broadcast_notification(user_id, notification_data):
    """
    Push a notification.new event to the recipient, if they're connected.

    Args:
        user_id: the recipient's users._id.
        notification_data: the serialized notification document.
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        user_group_name(str(user_id)),
        {
            'type': 'notification.new',  # -> NotificationConsumer.notification_new
            'data': notification_data,
        },
    )