"""
MongoDB index definitions.

Indexes are created by the `init_db` management command rather than
automatically at startup, so that index creation is an explicit,
observable step (this replaces what migrations do in an ORM project).

Format: { collection_name: [ (keys, options), ... ] }
  keys    = list of (field, direction) tuples; 1 = ascending, -1 = descending
  options = dict passed to create_index (e.g. unique=True)
"""

from pymongo import ASCENDING, DESCENDING

from core.constants import Collections

INDEX_DEFINITIONS = {
    Collections.USERS: [
        # Email and phone uniquely identify a user — prevents duplicate signup.
        ([('email', ASCENDING)], {'unique': True, 'name': 'uq_user_email'}),
        ([('phone', ASCENDING)], {'unique': True, 'name': 'uq_user_phone'}),
        ([('role', ASCENDING)], {'name': 'idx_user_role'}),
    ],

    Collections.FARMERS: [
        ([('user_id', ASCENDING)], {'unique': True, 'name': 'uq_farmer_user'}),
        ([('district', ASCENDING)], {'name': 'idx_farmer_district'}),
    ],

    Collections.STAFF: [
        ([('user_id', ASCENDING)], {'unique': True, 'name': 'uq_staff_user'}),
        ([('centre_id', ASCENDING)], {'name': 'idx_staff_centre'}),
    ],

    Collections.PROCUREMENT_CENTRES: [
        ([('name', ASCENDING)], {'name': 'idx_centre_name'}),
        ([('is_active', ASCENDING)], {'name': 'idx_centre_active'}),
    ],

    Collections.SLOTS: [
        # Farmers browse slots by centre + date — the single most common query.
        ([('centre_id', ASCENDING), ('date', ASCENDING)],
         {'name': 'idx_slot_centre_date'}),
        ([('date', ASCENDING), ('status', ASCENDING)],
         {'name': 'idx_slot_date_status'}),
        # Prevents two identical slots being created for the same centre/date/time.
        ([('centre_id', ASCENDING), ('date', ASCENDING), ('start_time', ASCENDING)],
         {'unique': True, 'name': 'uq_slot_centre_date_start'}),
    ],

    Collections.BOOKINGS: [
        ([('farmer_id', ASCENDING)], {'name': 'idx_booking_farmer'}),
        ([('centre_id', ASCENDING)], {'name': 'idx_booking_centre'}),
        ([('slot_id', ASCENDING)], {'name': 'idx_booking_slot'}),
        ([('status', ASCENDING)], {'name': 'idx_booking_status'}),
        # Token numbers are unique within a slot, not globally.
        ([('slot_id', ASCENDING), ('token_number', ASCENDING)],
         {'unique': True, 'name': 'uq_booking_slot_token'}),
        # Queue ordering query: all active bookings for a slot, in position order.
        ([('slot_id', ASCENDING), ('status', ASCENDING), ('queue_position', ASCENDING)],
         {'name': 'idx_booking_queue'}),
        ([('created_at', DESCENDING)], {'name': 'idx_booking_created'}),
    ],

    Collections.PROCUREMENTS: [
        ([('booking_id', ASCENDING)], {'unique': True, 'name': 'uq_proc_booking'}),
        ([('farmer_id', ASCENDING)], {'name': 'idx_proc_farmer'}),
        ([('centre_id', ASCENDING)], {'name': 'idx_proc_centre'}),
        ([('status', ASCENDING)], {'name': 'idx_proc_status'}),
        ([('procurement_date', DESCENDING)], {'name': 'idx_proc_date'}),
    ],

    Collections.PAYMENTS: [
        ([('procurement_id', ASCENDING)], {'unique': True, 'name': 'uq_pay_proc'}),
        ([('farmer_id', ASCENDING)], {'name': 'idx_pay_farmer'}),
        ([('status', ASCENDING)], {'name': 'idx_pay_status'}),
        ([('transaction_id', ASCENDING)],
         {'unique': True, 'sparse': True, 'name': 'uq_pay_txn'}),
    ],

    Collections.NOTIFICATIONS: [
        # Fetch a user's notifications newest-first — the only read pattern.
        ([('user_id', ASCENDING), ('created_at', DESCENDING)],
         {'name': 'idx_notif_user_created'}),
        ([('user_id', ASCENDING), ('is_read', ASCENDING)],
         {'name': 'idx_notif_user_unread'}),
    ],

    Collections.COUNTERS: [
        ([('key', ASCENDING)], {'unique': True, 'name': 'uq_counter_key'}),
    ],
     Collections.TOKEN_BLACKLIST: [
        ([('jti', ASCENDING)], {'unique': True, 'name': 'uq_blacklist_jti'}),
        # TTL index: MongoDB automatically deletes each document once
        # `expires_at` passes, so the blacklist never grows unbounded.
        ([('expires_at', ASCENDING)],
         {'expireAfterSeconds': 0, 'name': 'ttl_blacklist_expiry'}),
    ],
}