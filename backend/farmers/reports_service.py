"""
Admin reports: cross-centre aggregation for the reports screen.

Distinct from Step 13's staff dashboard (which is scoped to "today" for
day-to-day operational use) — this supports an arbitrary date range
across ALL centres, for the kind of summary an admin needs when
reviewing overall system performance.
"""

from datetime import datetime, timezone

from core.constants import BookingStatus, Collections, PaymentStatus, ProcurementStatus
from core.repository import BaseRepository
from core.validators import validate_date_string


class _ReadRepo(BaseRepository):
    pass


def _repo(collection_name):
    return type(f'_Repo_{collection_name}', (_ReadRepo,), {'collection_name': collection_name})()


user_repo = _repo(Collections.USERS)
farmer_repo = _repo(Collections.FARMERS)
centre_repo = _repo(Collections.PROCUREMENT_CENTRES)
booking_repo = _repo(Collections.BOOKINGS)
procurement_repo = _repo(Collections.PROCUREMENTS)
payment_repo = _repo(Collections.PAYMENTS)


def _date_range_filter(field, date_from, date_to):
    """Build a MongoDB range filter for a date field, or {} if unbounded."""
    range_filter = {}
    if date_from:
        range_filter['$gte'] = validate_date_string(date_from, "date_from")
    if date_to:
        range_filter['$lte'] = validate_date_string(date_to, "date_to")
    return {field: range_filter} if range_filter else {}


def get_system_report(date_from=None, date_to=None):
    """
    Assemble a system-wide report for the given date range (or all-time
    if no range is given).
    """
    booking_date_filter = _date_range_filter('booking_date', date_from, date_to)
    procurement_date_filter = _date_range_filter('procurement_date', date_from, date_to)

    # --- Platform totals (not date-scoped — these are lifetime counts) ---
    total_farmers = user_repo.count({'role': 'FARMER'})
    total_staff = user_repo.count({'role': 'STAFF'})
    total_centres = centre_repo.count({})
    active_centres = centre_repo.count({'is_active': True})

    # --- Bookings within range ---
    total_bookings = booking_repo.count(booking_date_filter)
    completed_bookings = booking_repo.count({**booking_date_filter, 'status': BookingStatus.COMPLETED})
    cancelled_bookings = booking_repo.count({**booking_date_filter, 'status': BookingStatus.CANCELLED})

    # --- Procurement within range ---
    total_procurement_records = procurement_repo.count(procurement_date_filter)

    quantity_by_crop = procurement_repo.aggregate([
        {'$match': {**procurement_date_filter, 'status': {'$ne': ProcurementStatus.REJECTED}}},
        {'$group': {
            '_id': '$crop_name',
            'total_quantity': {'$sum': '$quantity'},
            'total_value': {'$sum': '$total_amount'},
            'record_count': {'$sum': 1},
        }},
        {'$sort': {'total_value': -1}},
    ])

    # --- Payments within range (payments don't carry procurement_date,
    #     so we scope by created_at using the same bounds for consistency) ---
    payment_date_filter = _date_range_filter('created_at', date_from, date_to)

    paid_result = payment_repo.aggregate([
        {'$match': {**payment_date_filter, 'status': PaymentStatus.PAID}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}},
    ])
    total_paid_amount = paid_result[0]['total'] if paid_result else 0
    total_paid_count = paid_result[0]['count'] if paid_result else 0

    pending_payment_count = payment_repo.count({**payment_date_filter, 'status': PaymentStatus.PENDING})

    # --- Per-centre breakdown ---
    centres = centre_repo.find_many({}, sort=[('name', 1)])
    centre_breakdown = []
    for centre in centres:
        centre_bookings = booking_repo.count({**booking_date_filter, 'centre_id': centre['_id']})
        centre_procurement = procurement_repo.aggregate([
            {'$match': {
                **procurement_date_filter,
                'centre_id': centre['_id'],
                'status': {'$ne': ProcurementStatus.REJECTED},
            }},
            {'$group': {'_id': None, 'total_value': {'$sum': '$total_amount'}}},
        ])
        centre_breakdown.append({
            'centre_id': str(centre['_id']),
            'centre_name': centre['name'],
            'is_active': centre.get('is_active', True),
            'booking_count': centre_bookings,
            'procurement_value': round(
                float(centre_procurement[0]['total_value']) if centre_procurement else 0, 2
            ),
        })

    return {
        'platform_totals': {
            'total_farmers': total_farmers,
            'total_staff': total_staff,
            'total_centres': total_centres,
            'active_centres': active_centres,
        },
        'booking_summary': {
            'total': total_bookings,
            'completed': completed_bookings,
            'cancelled': cancelled_bookings,
        },
        'procurement_summary': {
            'total_records': total_procurement_records,
            'by_crop': [
                {
                    'crop_name': row['_id'],
                    'total_quantity': round(float(row['total_quantity']), 2),
                    'total_value': round(float(row['total_value']), 2),
                    'record_count': row['record_count'],
                }
                for row in quantity_by_crop
            ],
        },
        'payment_summary': {
            'total_paid_amount': round(float(total_paid_amount), 2),
            'total_paid_count': total_paid_count,
            'pending_count': pending_payment_count,
        },
        'centre_breakdown': centre_breakdown,
        'date_range': {'from': date_from, 'to': date_to},
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }