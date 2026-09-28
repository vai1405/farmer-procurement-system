"""
Data-access layer for the procurement module.

This file covers CENTRES in Step 5. Slot-specific queries are added in
Step 6, and procurement-record queries in Step 10 — all within this same
app, since they form one connected domain.
"""

from core.constants import Collections
from core.repository import BaseRepository


class CentreRepository(BaseRepository):
    """Access to the `procurement_centres` collection."""

    collection_name = Collections.PROCUREMENT_CENTRES

    def search(self, keyword=None, is_active=None, skip=0, limit=0):
        """
        List centres with optional keyword search (name or location) and
        active-status filtering. Used by both the staff management table
        and the farmer's centre picker (Step 6).
        """
        filters = {}

        if keyword:
            # Case-insensitive partial match on name or location.
            filters['$or'] = [
                {'name': {'$regex': keyword, '$options': 'i'}},
                {'location': {'$regex': keyword, '$options': 'i'}},
            ]

        if is_active is not None:
            filters['is_active'] = is_active

        return self.find_many(filters, sort=[('name', 1)], skip=skip, limit=limit)

    def count_search(self, keyword=None, is_active=None):
        """Count matching centres — mirrors `search` for pagination totals."""
        filters = {}

        if keyword:
            filters['$or'] = [
                {'name': {'$regex': keyword, '$options': 'i'}},
                {'location': {'$regex': keyword, '$options': 'i'}},
            ]

        if is_active is not None:
            filters['is_active'] = is_active

        return self.count(filters)

    def name_exists(self, name, exclude_id=None):
        """
        Check whether a centre with this name already exists.
        Used to give a friendlier error than relying on a unique index,
        since centre names are not enforced unique at the database level
        (two centres could legitimately share a name in different towns —
        we only warn, we don't hard-block via an index).
        """
        filters = {'name': {'$regex': f'^{name}$', '$options': 'i'}}
        if exclude_id:
            filters['_id'] = {'$ne': exclude_id}
        return self.exists(filters)

    def active_centres(self):
        """All centres currently open for booking — used by Step 6."""
        return self.find_many({'is_active': True}, sort=[('name', 1)])
    # ---------------------------------------------------------------------------
# SLOT REPOSITORY
# ---------------------------------------------------------------------------
from core.constants import SlotStatus  # noqa: E402


class SlotRepository(BaseRepository):
    """Access to the `slots` collection."""

    collection_name = Collections.SLOTS

    def find_by_centre_and_date(self, centre_id, date):
        """All slots for one centre on one date, ordered by start time."""
        return self.find_many(
            {'centre_id': centre_id, 'date': date},
            sort=[('start_time', 1)],
        )

    def find_overlapping(self, centre_id, date, start_time, end_time, exclude_id=None):
        """
        Find slots at the same centre/date whose time range overlaps the
        given [start_time, end_time) window.

        Two ranges [s1,e1) and [s2,e2) overlap iff s1 < e2 AND s2 < e1.
        Times are stored as 'HH:MM' strings, which sort correctly
        lexicographically because they are zero-padded and 24-hour.
        """
        filters = {
            'centre_id': centre_id,
            'date': date,
            'start_time': {'$lt': end_time},
            'end_time': {'$gt': start_time},
        }
        if exclude_id:
            filters['_id'] = {'$ne': exclude_id}

        return self.find_many(filters)

    def search(self, centre_id=None, date_from=None, date_to=None,
               status=None, skip=0, limit=0):
        """Flexible slot listing used by the staff management table."""
        filters = {}

        if centre_id:
            filters['centre_id'] = centre_id

        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter['$gte'] = date_from
            if date_to:
                date_filter['$lte'] = date_to
            filters['date'] = date_filter

        if status == SlotStatus.ACTIVE:
            filters['is_active'] = True
        elif status == SlotStatus.INACTIVE:
            filters['is_active'] = False

        return self.find_many(
            filters, sort=[('date', 1), ('start_time', 1)], skip=skip, limit=limit,
        )

    def count_search(self, centre_id=None, date_from=None, date_to=None, status=None):
        filters = {}

        if centre_id:
            filters['centre_id'] = centre_id

        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter['$gte'] = date_from
            if date_to:
                date_filter['$lte'] = date_to
            filters['date'] = date_filter

        if status == SlotStatus.ACTIVE:
            filters['is_active'] = True
        elif status == SlotStatus.INACTIVE:
            filters['is_active'] = False

        return self.count(filters)

    def find_available_for_centre(self, centre_id, date_from=None):
        """
        Slots a farmer could book: active, not full, today or later.

        Used by the farmer-facing availability view.
        """
        from datetime import datetime

        filters = {
            'centre_id': centre_id,
            'is_active': True,
            'date': {'$gte': date_from or datetime.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            )},
            '$expr': {'$lt': ['$booked_count', '$max_farmers']},
        }
        return self.find_many(filters, sort=[('date', 1), ('start_time', 1)])

    def increment_booked_count(self, slot_id, amount=1):
        """
        Atomically increase booked_count, used by the booking flow in
        Step 7. Kept here (not in queue_management) because it operates
        directly on the slot document this repository owns.
        """
        from bson import ObjectId
        return self.collection.find_one_and_update(
            {'_id': ObjectId(str(slot_id)) if not isinstance(slot_id, type(None)) else slot_id},
            {'$inc': {'booked_count': amount}},
            return_document=True,
        )
    # ---------------------------------------------------------------------------
# PROCUREMENT REPOSITORY (Step 10)
# ---------------------------------------------------------------------------
class ProcurementRepository(BaseRepository):
    """Access to the `procurements` collection."""

    collection_name = Collections.PROCUREMENTS

    def find_by_booking(self, booking_id):
        """A booking may have at most one procurement record (unique index)."""
        return self.find_one({'booking_id': booking_id})

    def search(self, centre_id=None, farmer_id=None, status=None,
               date_from=None, date_to=None, skip=0, limit=0):
        """Flexible listing for the staff procurement history table."""
        filters = {}

        if centre_id:
            filters['centre_id'] = centre_id
        if farmer_id:
            filters['farmer_id'] = farmer_id
        if status:
            filters['status'] = status
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter['$gte'] = date_from
            if date_to:
                date_filter['$lte'] = date_to
            filters['procurement_date'] = date_filter

        return self.find_many(filters, sort=[('created_at', -1)], skip=skip, limit=limit)

    def count_search(self, centre_id=None, farmer_id=None, status=None,
                      date_from=None, date_to=None):
        filters = {}

        if centre_id:
            filters['centre_id'] = centre_id
        if farmer_id:
            filters['farmer_id'] = farmer_id
        if status:
            filters['status'] = status
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter['$gte'] = date_from
            if date_to:
                date_filter['$lte'] = date_to
            filters['procurement_date'] = date_filter

        return self.count(filters)