"""
Notification creation and retrieval.

notify() is the single entry point every other module uses to create a
notification. It writes the document to MongoDB AND pushes it live over
the user's personal WebSocket group, so the bell icon and unread count
update instantly without a page refresh — mirroring the queue broadcast
pattern from Step 9.
"""

from bson import ObjectId

from core.exceptions import NotFoundException, ValidationException
from core.serializers import serialize_document
from core.validators import validate_object_id
from notifications.repositories import NotificationRepository

notification_repo = NotificationRepository()


def notify(user_id, notification_type, title, message):
    """
    Create a notification for a user and push it live.

    Args:
        user_id: ObjectId or string — the RECIPIENT's users._id (not the
            farmer/staff profile id — notifications are addressed to the
            login identity, since that's what the WebSocket group and
            navbar bell are keyed on).
        notification_type: one of core.constants.NotificationType.
        title: short heading, e.g. "Slot Booked".
        message: full text, matching the spec's example phrasing.

    This function never raises on failure to broadcast (e.g. Redis
    down) — the notification is still safely persisted to MongoDB even
    if the live push doesn't reach anyone currently online.
    """
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    notification_id = notification_repo.create({
        'user_id': user_id,
        'type': notification_type,
        'title': title,
        'message': message,
        'is_read': False,
    })

    notification = notification_repo.find_by_id(notification_id)
    serialized = serialize_document(notification)

    # Push live — see broadcast.py. Wrapped defensively so a Redis outage
    # never breaks the calling feature (booking, payment, etc).
    try:
        from notifications.broadcast import broadcast_notification
        broadcast_notification(user_id, serialized)
    except Exception:  # noqa: BLE001 - never let a broadcast failure break the caller
        pass

    return serialized


def list_notifications(user_id, unread_only=False, page=1, page_size=20):
    """Paginated notification list for the authenticated user."""
    skip = (page - 1) * page_size

    notifications = notification_repo.find_by_user(
        user_id, unread_only=unread_only, skip=skip, limit=page_size,
    )
    total = notification_repo.count(
        {'user_id': user_id, **({'is_read': False} if unread_only else {})}
    )
    unread_count = notification_repo.count_unread(user_id)

    return {
        'notifications': [serialize_document(n) for n in notifications],
        'unread_count': unread_count,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(1, (total + page_size - 1) // page_size),
        },
    }


def get_unread_count(user_id):
    """Lightweight count-only call, used by the navbar bell on page load."""
    return notification_repo.count_unread(user_id)


def mark_as_read(user_id, notification_id):
    """Mark one notification as read, scoped to the requesting user."""
    object_id = validate_object_id(notification_id, field_name="notification")

    updated = notification_repo.mark_read(object_id, user_id)
    if not updated:
        raise NotFoundException("Notification not found.")

    return serialize_document(notification_repo.find_by_id(object_id))


def mark_all_as_read(user_id):
    """Mark every unread notification for this user as read."""
    count = notification_repo.mark_all_read(user_id)
    return {'marked_count': count}