"""
Data-access layer for the payments module.
"""

from core.constants import Collections
from core.repository import BaseRepository


class PaymentRepository(BaseRepository):
    """Access to the `payments` collection."""

    collection_name = Collections.PAYMENTS

    def find_by_procurement(self, procurement_id):
        """A procurement may have at most one payment record (unique index)."""
        return self.find_one({'procurement_id': procurement_id})

    def find_by_farmer(self, farmer_id, status=None):
        """All payments for a farmer, newest first — used by the farmer view."""
        filters = {'farmer_id': farmer_id}
        if status:
            filters['status'] = status
        return self.find_many(filters, sort=[('created_at', -1)])

    def search(self, centre_id=None, farmer_id=None, status=None, skip=0, limit=0):
        """Flexible listing for the staff payment management table."""
        filters = {}
        if centre_id:
            filters['centre_id'] = centre_id
        if farmer_id:
            filters['farmer_id'] = farmer_id
        if status:
            filters['status'] = status

        return self.find_many(filters, sort=[('created_at', -1)], skip=skip, limit=limit)

    def count_search(self, centre_id=None, farmer_id=None, status=None):
        filters = {}
        if centre_id:
            filters['centre_id'] = centre_id
        if farmer_id:
            filters['farmer_id'] = farmer_id
        if status:
            filters['status'] = status

        return self.count(filters)

    def transaction_id_exists(self, transaction_id, exclude_id=None):
        """Transaction IDs, when provided, must be unique (sparse index from Step 2)."""
        if not transaction_id:
            return False
        filters = {'transaction_id': transaction_id}
        if exclude_id:
            filters['_id'] = {'$ne': exclude_id}
        return self.exists(filters)