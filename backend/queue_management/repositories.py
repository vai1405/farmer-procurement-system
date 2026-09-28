"""
Data-access layer for the queue_management module.

Covers: the token counter, and (from Step 8 onward) queue-specific
booking queries. Bookings themselves are created here because token
generation and booking creation are tightly coupled — see services.py.
"""

from core.constants import Collections
from core.repository import BaseRepository


class CounterRepository(BaseRepository):
    """
    Access to the `counters` collection.

    Used to generate atomic, sequential integers scoped to any key —
    here, one counter per slot, so token numbers are sequential and
    unique WITHIN a slot (not globally, which the spec's example token
    "#42" doesn't require either way).
    """

    collection_name = Collections.COUNTERS

    def next_value(self, key):
        """
        Atomically increment and return the next value for `key`.

        Uses upsert=True so the very first call for a brand-new key
        creates the counter starting at 1, in a single atomic operation
        (no separate "does this counter exist" check needed).
        """
        result = self.collection.find_one_and_update(
            {'key': key},
            {'$inc': {'value': 1}},
            upsert=True,
            return_document=True,  # ReturnDocument.AFTER
        )
        return result['value']


class BookingRepository(BaseRepository):
    """Access to the `bookings` collection."""

    collection_name = Collections.BOOKINGS

    def find_by_farmer(self, farmer_id, status_list=None, sort=None):
        filters = {'farmer_id': farmer_id}
        if status_list:
            filters['status'] = {'$in': status_list}
        return self.find_many(filters, sort=sort or [('created_at', -1)])

    def find_active_by_farmer(self, farmer_id):
        from core.constants import BookingStatus
        return self.find_many(
            {'farmer_id': farmer_id, 'status': {'$in': BookingStatus.ACTIVE}},
            sort=[('created_at', -1)],
        )

    def has_active_booking_for_slot(self, farmer_id, slot_id):
        from core.constants import BookingStatus
        return self.exists({
            'farmer_id': farmer_id, 'slot_id': slot_id,
            'status': {'$in': BookingStatus.ACTIVE},
        })

    def has_any_active_booking_same_day(self, farmer_id, date):
        from core.constants import BookingStatus
        return self.exists({
            'farmer_id': farmer_id, 'booking_date': date,
            'status': {'$in': BookingStatus.ACTIVE},
        })

    def find_by_slot(self, slot_id, status_list=None):
        filters = {'slot_id': slot_id}
        if status_list:
            filters['status'] = {'$in': status_list}
        return self.find_many(filters, sort=[('queue_position', 1)])

    def max_queue_position(self, slot_id):
        result = self.find_many({'slot_id': slot_id}, sort=[('queue_position', -1)], limit=1)
        return result[0]['queue_position'] if result else 0

    # ---------------- Queue operations (Step 8) ----------------

    def find_waiting(self, slot_id):
        """Bookings still waiting to be called, oldest position first."""
        from core.constants import BookingStatus
        return self.find_many(
            {'slot_id': slot_id, 'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]}},
            sort=[('queue_position', 1)],
        )

    def find_in_service(self, slot_id):
        """Bookings currently called or being processed."""
        from core.constants import BookingStatus
        return self.find_many(
            {'slot_id': slot_id, 'status': {'$in': [BookingStatus.CALLED, BookingStatus.PROCESSING]}},
            sort=[('queue_position', 1)],
        )

    def call_next_atomic(self, slot_id):
        """
        Atomically claim the next waiting booking (lowest queue_position)
        and mark it CALLED.

        This is THE concurrency guard for queue advancement, mirroring the
        seat-reservation pattern from Step 7's create_booking(). `sort`
        ensures we always pick the earliest position; the entire
        find-and-update happens as one indivisible MongoDB operation, so
        two simultaneous "call next" requests can never claim the same
        booking.

        Returns:
            dict: the now-CALLED booking document, or None if nobody is waiting.
        """
        from datetime import datetime, timezone
        from core.constants import BookingStatus

        now = datetime.now(timezone.utc)

        return self.collection.find_one_and_update(
            {
                'slot_id': slot_id,
                'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]},
            },
            {
                '$set': {
                    'status': BookingStatus.CALLED,
                    'called_at': now,
                    'updated_at': now,
                }
            },
            sort=[('queue_position', 1)],
            return_document=True,
        )
    """Access to the `bookings` collection."""

    collection_name = Collections.BOOKINGS

    def find_by_farmer(self, farmer_id, status_list=None, sort=None):
        """All bookings for one farmer, optionally filtered by status."""
        filters = {'farmer_id': farmer_id}
        if status_list:
            filters['status'] = {'$in': status_list}

        return self.find_many(filters, sort=sort or [('created_at', -1)])

    def find_active_by_farmer(self, farmer_id):
        """A farmer's currently active (not completed/cancelled) bookings."""
        from core.constants import BookingStatus

        return self.find_many(
            {'farmer_id': farmer_id, 'status': {'$in': BookingStatus.ACTIVE}},
            sort=[('created_at', -1)],
        )

    def has_active_booking_for_slot(self, farmer_id, slot_id):
        """Prevent a farmer from booking the same slot twice."""
        from core.constants import BookingStatus

        return self.exists({
            'farmer_id': farmer_id,
            'slot_id': slot_id,
            'status': {'$in': BookingStatus.ACTIVE},
        })

    def has_any_active_booking_same_day(self, farmer_id, date):
        """
        Prevent a farmer from holding two active bookings on the same
        calendar date, even at different centres/slots — avoids a farmer
        occupying two queues simultaneously.
        """
        from core.constants import BookingStatus

        return self.exists({
            'farmer_id': farmer_id,
            'booking_date': date,
            'status': {'$in': BookingStatus.ACTIVE},
        })

    def find_by_slot(self, slot_id, status_list=None):
        """All bookings for a slot, ordered by queue position."""
        filters = {'slot_id': slot_id}
        if status_list:
            filters['status'] = {'$in': status_list}
        return self.find_many(filters, sort=[('queue_position', 1)])

    def max_queue_position(self, slot_id):
        """Highest queue_position currently assigned within a slot."""
        result = self.find_many(
            {'slot_id': slot_id}, sort=[('queue_position', -1)], limit=1,
        )
        return result[0]['queue_position'] if result else 0
    # ---------------------------------------------------------------------------
# QUEUE OPERATIONS (added in Step 8)
# ---------------------------------------------------------------------------
from datetime import datetime, timezone  # noqa: E402
from core.constants import BookingStatus  # noqa: E402


def _queue_repo_extensions():
    """Marker so re-reading this file makes the append point obvious."""


class BookingRepository(BookingRepository):  # noqa: F811 - intentional reopen
    """
    Reopening BookingRepository to add queue-movement methods, keeping the
    original class defined once at the top of the file for readability.
    (Python allows this; the class body below adds new methods on top of
    the ones already defined in Step 7.)
    """

    def find_waiting(self, slot_id):
        """Bookings still waiting to be called, oldest position first."""
        return self.find_many(
            {'slot_id': slot_id, 'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]}},
            sort=[('queue_position', 1)],
        )

    def find_in_service(self, slot_id):
        """Bookings currently called or being processed."""
        return self.find_many(
            {'slot_id': slot_id, 'status': {'$in': [BookingStatus.CALLED, BookingStatus.PROCESSING]}},
            sort=[('queue_position', 1)],
        )

    def call_next_atomic(self, slot_id):
        """
        Atomically claim the next waiting booking (lowest queue_position)
        and mark it CALLED.

        This is THE concurrency guard for queue advancement, mirroring the
        seat-reservation pattern from Step 7. `sort` ensures we always pick
        the earliest position; the whole find+update happens as one
        indivisible MongoDB operation, so two simultaneous "call next"
        requests can never claim the same booking.

        Returns:
            dict: the now-CALLED booking document, or None if nobody is waiting.
        """
        now = datetime.now(timezone.utc)

        return self.collection.find_one_and_update(
            {
                'slot_id': slot_id,
                'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]},
            },
            {
                '$set': {
                    'status': BookingStatus.CALLED,
                    'called_at': now,
                    'updated_at': now,
                }
            },
            sort=[('queue_position', 1)],
            return_document=True,
        )