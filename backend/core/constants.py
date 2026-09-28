"""
Central definitions for roles, statuses, and collection names.

Every module imports its status strings from here. Never hard-code a
status string anywhere else in the project.
"""


class Collections:
    """MongoDB collection names."""
    USERS = 'users'
    FARMERS = 'farmers'
    STAFF = 'staff'
    PROCUREMENT_CENTRES = 'procurement_centres'
    SLOTS = 'slots'
    BOOKINGS = 'bookings'
    PROCUREMENTS = 'procurements'
    PAYMENTS = 'payments'
    NOTIFICATIONS = 'notifications'
    COUNTERS = 'counters'
    TOKEN_BLACKLIST = 'token_blacklist'   # <-- ADD THIS LINE


class Roles:
    """User roles supported by the system."""
    FARMER = 'FARMER'
    STAFF = 'STAFF'
    ADMIN = 'ADMIN'

    ALL = [FARMER, STAFF, ADMIN]


class BookingStatus:
    BOOKED = 'BOOKED'
    WAITING = 'WAITING'
    CALLED = 'CALLED'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    ALL = [BOOKED, WAITING, CALLED, PROCESSING, COMPLETED, CANCELLED]
    # Statuses that still occupy a place in the queue.
    ACTIVE = [BOOKED, WAITING, CALLED, PROCESSING]


class SlotStatus:
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    FULL = 'FULL'

    ALL = [ACTIVE, INACTIVE, FULL]


class ProcurementStatus:
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    REJECTED = 'REJECTED'

    ALL = [PENDING, IN_PROGRESS, COMPLETED, REJECTED]


class PaymentStatus:
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    PAID = 'PAID'
    FAILED = 'FAILED'

    ALL = [PENDING, PROCESSING, PAID, FAILED]


class NotificationType:
    REGISTRATION = 'REGISTRATION'
    BOOKING_CONFIRMED = 'BOOKING_CONFIRMED'
    BOOKING_CANCELLED = 'BOOKING_CANCELLED'
    QUEUE_APPROACHING = 'QUEUE_APPROACHING'
    FARMER_CALLED = 'FARMER_CALLED'
    PROCUREMENT_COMPLETED = 'PROCUREMENT_COMPLETED'
    PAYMENT_COMPLETED = 'PAYMENT_COMPLETED'

    ALL = [
        REGISTRATION, BOOKING_CONFIRMED, BOOKING_CANCELLED,
        QUEUE_APPROACHING, FARMER_CALLED,
        PROCUREMENT_COMPLETED, PAYMENT_COMPLETED,
    ]


# Average minutes spent serving one farmer — used to estimate waiting time.
# Tune this value based on your demo scenario.
AVERAGE_SERVICE_MINUTES = 5
