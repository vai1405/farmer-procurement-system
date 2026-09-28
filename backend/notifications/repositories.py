"""
Data-access layer for the notifications module.
"""

from core.constants import Collections
from core.repository import BaseRepository


class NotificationRepository(BaseRepository):
    """Access to the `notifications` collection."""

    collection_name = Collections.NOTIFICATIONS

    def find_by_user(self, user_id, unread_only=False, skip=0, limit=0):
        """A user's notifications, newest first."""
        filters = {'user_id': user_id}
        if unread_only:
            filters['is_read'] = False

        return self.find_many(filters, sort=[('created_at', -1)], skip=skip, limit=limit)

    def count_unread(self, user_id):
        return self.count({'user_id': user_id, 'is_read': False})

    def mark_read(self, notification_id, user_id):
        """
        Mark a single notification as read.

        Filters by BOTH notification_id and user_id in one operation, so
        a user can never mark someone else's notification as read even
        by guessing an id — this is the ownership check and the update
        happening as a single atomic step.
        """
        result = self.collection.update_one(
            {'_id': notification_id, 'user_id': user_id},
            {'$set': {'is_read': True}},
        )
        return result.matched_count > 0

    def mark_all_read(self, user_id):
        """Mark every unread notification for a user as read. Returns the count updated."""
        result = self.collection.update_many(
            {'user_id': user_id, 'is_read': False},
            {'$set': {'is_read': True}},
        )
        return result.modified_count