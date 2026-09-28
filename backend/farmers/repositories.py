"""
Data-access layer for farmer profile data.

The farmer's login credentials live in `users` (owned by the accounts
module); their agricultural profile lives in `farmers`. This repository
covers the latter.
"""

from core.constants import Collections
from core.repository import BaseRepository


class FarmerRepository(BaseRepository):
    """Access to the `farmers` collection."""

    collection_name = Collections.FARMERS

    def find_by_user_id(self, user_id):
        """Fetch a farmer profile by the owning user's ObjectId."""
        return self.find_one({'user_id': user_id})

    def update_by_user_id(self, user_id, data):
        """Update a farmer profile identified by user_id rather than _id."""
        from core.repository import utc_now

        return self.update_one(
            {'user_id': user_id},
            {'$set': {**data, 'updated_at': utc_now()}},
        )

    def search(self, filters=None, skip=0, limit=0):
        """
        List farmer profiles, newest first.
        Used by the staff "Farmers" page in Step 13.
        """
        return self.find_many(
            filters or {},
            sort=[('created_at', -1)],
            skip=skip,
            limit=limit,
        )