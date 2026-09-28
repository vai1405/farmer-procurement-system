"""
Staff dashboard aggregation.

Read-only summary of today's operational picture, assembled from
collections owned by other modules — the same "graceful aggregation"
pattern used by farmers/dashboard_service.py in Step 4. No new
collection is introduced; this file only queries and shapes existing
data for the staff overview screen.
"""

from datetime import datetime, time, timedelta, timezone

from core.constants import (
    BookingStatus,
    Collections,
    PaymentStatus,
    ProcurementStatus,
)
from core.repository import BaseRepository
from core.serializers import serialize_documents


class _ReadRepo(BaseRepository):
    """Generic read-only repository, instantiated per collection below."""


def _repo(collection_name):
    return type(f'_Repo_{collection_name}', (_ReadRepo,), {'collection_name': collection_name})()


booking_repo = _repo(Collections.BOOKINGS)
slot_repo = _repo(Collections.SLOTS)
centre_repo = _repo(Collections.PROCUREMENT_CENTRES)
procurement_repo = _repo(Collections.PROCUREMENTS)
payment_repo = _repo(Collections.PAYMENTS)
farmer_repo = _repo(Collections.FARMERS)


def _today_bounds():
    """Return (start, end) datetimes spanning today, in UTC."""
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start, end


def _booking_stats_today():
    """Counts of today's bookings by status."""
    start, end = _today_bounds()
    filters = {'booking_date': {'$gte': start, '$lt': end}}

    total = booking_repo.count(filters)
    waiting = booking_repo.count({**filters, 'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]}})
    in_service = booking_repo.count({**filters, 'status': {'$in': [BookingStatus.CALLED, BookingStatus.PROCESSING]}})
    completed = booking_repo.count({**filters, 'status': BookingStatus.COMPLETED})
    cancelled = booking_repo.count({**filters, 'status': BookingStatus.CANCELLED})

    return {
        'total': total,
        'waiting': waiting,
        'in_service': in_service,
        'completed': completed,
        'cancelled': cancelled,
    }


def _active_slot_summaries():
    """
    One row per active slot scheduled today, with live queue counts —
    powers the "Active Queues" table so staff see every centre's status
    at a glance without opening Queue Control for each one individually.
    """
    start, end = _today_bounds()

    slots = slot_repo.find_many(
        {'date': {'$gte': start, '$lt': end}, 'is_active': True},
        sort=[('start_time', 1)],
    )

    summaries = []
    for slot in slots:
        waiting_count = booking_repo.count({
            'slot_id': slot['_id'],
            'status': {'$in': [BookingStatus.BOOKED, BookingStatus.WAITING]},
        })
        in_service_count = booking_repo.count({
            'slot_id': slot['_id'],
            'status': {'$in': [BookingStatus.CALLED, BookingStatus.PROCESSING]},
        })

        centre = centre_repo.find_by_id(slot['centre_id'])

        summaries.append({
            'slot_id': str(slot['_id']),
            'centre_id': str(slot['centre_id']),
            'centre_name': centre.get('name') if centre else 'Unknown',
            'start_time': slot['start_time'],
            'end_time': slot['end_time'],
            'current_token': slot.get('current_token'),
            'waiting_count': waiting_count,
            'in_service_count': in_service_count,
            'booked_count': slot.get('booked_count', 0),
            'max_farmers': slot.get('max_farmers', 0),
        })

    return summaries


def _procurement_stats_today():
    """Today's procurement volume and pending-review count."""
    start, end = _today_bounds()
    filters = {'procurement_date': {'$gte': start, '$lt': end}}

    total_records = procurement_repo.count(filters)
    pending_review = procurement_repo.count({**filters, 'status': ProcurementStatus.PENDING})
    completed = procurement_repo.count({**filters, 'status': ProcurementStatus.COMPLETED})

    quantity_result = procurement_repo.aggregate([
        {'$match': {**filters, 'status': {'$ne': ProcurementStatus.REJECTED}}},
        {'$group': {'_id': None, 'total_quantity': {'$sum': '$quantity'}}},
    ])
    total_quantity = quantity_result[0]['total_quantity'] if quantity_result else 0

    return {
        'total_records': total_records,
        'pending_review': pending_review,
        'completed': completed,
        'total_quantity': round(float(total_quantity), 2),
    }


def _payment_stats_today():
    """Today's payment volume, split by status."""
    start, end = _today_bounds()
    filters = {'created_at': {'$gte': start, '$lt': end}}

    pending_count = payment_repo.count({**filters, 'status': PaymentStatus.PENDING})

    paid_result = payment_repo.aggregate([
        {'$match': {**filters, 'status': PaymentStatus.PAID}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}},
    ])
    paid_total = paid_result[0]['total'] if paid_result else 0
    paid_count = paid_result[0]['count'] if paid_result else 0

    return {
        'pending_count': pending_count,
        'paid_count': paid_count,
        'paid_total': round(float(paid_total), 2),
    }


def get_staff_dashboard():
    """
    Assemble the complete staff dashboard payload:
        booking_stats      - today's bookings by status
        active_slots        - live per-slot queue summaries
        procurement_stats   - today's procurement volume
        payment_stats       - today's payment volume
        active_centre_count - number of currently-active centres
    """
    return {
        'booking_stats': _booking_stats_today(),
        'active_slots': _active_slot_summaries(),
        'procurement_stats': _procurement_stats_today(),
        'payment_stats': _payment_stats_today(),
        'active_centre_count': centre_repo.count({'is_active': True}),
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


def list_farmers(keyword=None, page=1, page_size=20):
    """
    Paginated, searchable farmer directory for staff.

    Searches full_name, phone, and village — the fields staff are most
    likely to have on hand when looking someone up.
    """
    filters = {}
    if keyword:
        filters['$or'] = [
            {'full_name': {'$regex': keyword, '$options': 'i'}},
            {'phone': {'$regex': keyword, '$options': 'i'}},
            {'village': {'$regex': keyword, '$options': 'i'}},
        ]

    skip = (page - 1) * page_size

    farmers = farmer_repo.find_many(filters, sort=[('full_name', 1)], skip=skip, limit=page_size)
    total = farmer_repo.count(filters)

    results = []
    for farmer in farmers:
        booking_count = booking_repo.count({'farmer_id': farmer['_id']})
        completed_count = booking_repo.count({
            'farmer_id': farmer['_id'], 'status': BookingStatus.COMPLETED,
        })

        results.append({
            **serialize_documents([farmer])[0],
            'total_bookings': booking_count,
            'completed_bookings': completed_count,
        })

    return {
        'farmers': results,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(1, (total + page_size - 1) // page_size),
        },
    }


def get_farmer_detail(farmer_id):
    """
    Full profile plus booking history for one farmer — used by the
    "View Details" action on the staff Farmers page.
    """
    from core.exceptions import NotFoundException
    from core.validators import validate_object_id

    farmer_object_id = validate_object_id(farmer_id, field_name="farmer")
    farmer = farmer_repo.find_by_id(farmer_object_id)
    if not farmer:
        raise NotFoundException("Farmer not found.")

    bookings = booking_repo.find_many(
        {'farmer_id': farmer['_id']}, sort=[('created_at', -1)], limit=10,
    )

    booking_summaries = []
    for booking in bookings:
        centre = centre_repo.find_by_id(booking['centre_id'])
        booking_summaries.append({
            'booking_id': str(booking['_id']),
            'token_number': booking.get('token_number'),
            'status': booking.get('status'),
            'centre_name': centre.get('name') if centre else 'Unknown',
            'booking_date': booking.get('booking_date').isoformat()
            if booking.get('booking_date') else None,
        })

    return {
        **serialize_documents([farmer])[0],
        'recent_bookings': booking_summaries,
        'total_bookings': booking_repo.count({'farmer_id': farmer['_id']}),
    }