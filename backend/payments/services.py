"""
Payment tracking business logic.

IMPORTANT (per spec Section 12): this module is a RECORD-MANAGEMENT
feature for demonstration purposes. No real payment gateway is
integrated, and no code here should be read as claiming an actual money
transfer has occurred. Staff manually record what payment method was
used and mark status changes as the real-world payment progresses
outside this system.
"""

from datetime import datetime, timezone

from core.constants import Collections, PaymentStatus, ProcurementStatus
from core.exceptions import ConflictException, NotFoundException
from core.repository import BaseRepository
from core.serializers import serialize_document
from payments.repositories import PaymentRepository
from payments.validators import validate_payment_create, validate_payment_update

payment_repo = PaymentRepository()


# Local read-only repositories for collections this module doesn't own.
class _ProcurementRepo(BaseRepository):
    collection_name = Collections.PROCUREMENTS


class _FarmerRepo(BaseRepository):
    collection_name = Collections.FARMERS


class _CentreRepo(BaseRepository):
    collection_name = Collections.PROCUREMENT_CENTRES


procurement_repo_ro = _ProcurementRepo()
farmer_repo_ro = _FarmerRepo()
centre_repo_ro = _CentreRepo()


def _serialize_payment(payment_document):
    """Serialize a payment with farmer/centre/crop context attached for display."""
    data = serialize_document(payment_document)

    farmer = farmer_repo_ro.find_by_id(payment_document['farmer_id'])
    centre = centre_repo_ro.find_by_id(payment_document['centre_id'])
    procurement = procurement_repo_ro.find_by_id(payment_document['procurement_id'])

    data['farmer_name'] = farmer.get('full_name') if farmer else 'Unknown'
    data['centre_name'] = centre.get('name') if centre else 'Unknown'
    data['crop_name'] = procurement.get('crop_name') if procurement else None
    data['quantity'] = procurement.get('quantity') if procurement else None
    data['unit'] = procurement.get('unit') if procurement else None

    return data


def create_payment(data):
    """
    Create a payment record for a completed procurement.

    Enforces:
      - the procurement must exist and be COMPLETED (paying for crops
        that haven't been confirmed as received doesn't make sense)
      - at most one payment per procurement
      - amount is snapshotted from procurement.total_amount at creation
        time — never accepted from the request body
      - transaction_id, if given, must be unique across all payments

    New payments start at PENDING status; staff advance them through
    PROCESSING -> PAID (or -> FAILED) via update_payment.
    """
    cleaned = validate_payment_create(data)

    procurement = procurement_repo_ro.find_by_id(cleaned['procurement_id'])
    if not procurement:
        raise NotFoundException("Procurement record not found.")

    if procurement['status'] != ProcurementStatus.COMPLETED:
        raise ConflictException(
            "Payment can only be recorded for a completed procurement. "
            f"Current status: '{procurement['status']}'."
        )

    if payment_repo.find_by_procurement(procurement['_id']):
        raise ConflictException(
            "A payment record already exists for this procurement."
        )

    if cleaned['transaction_id'] and payment_repo.transaction_id_exists(
        cleaned['transaction_id']
    ):
        raise ConflictException(
            f"Transaction ID '{cleaned['transaction_id']}' is already in use."
        )

    payment_id = payment_repo.create({
        'procurement_id': procurement['_id'],
        'farmer_id': procurement['farmer_id'],
        'centre_id': procurement['centre_id'],
        'amount': procurement['total_amount'],  # snapshot, per the design note above
        'payment_method': cleaned['payment_method'],
        'transaction_id': cleaned['transaction_id'],
        'status': PaymentStatus.PENDING,
        'payment_date': None,  # set only when marked PAID
    })

    return _serialize_payment(payment_repo.find_by_id(payment_id))


def update_payment(payment_id, data):
    """
    Update a payment record — typically to advance its status.

    Setting status to PAID automatically stamps payment_date with the
    current time (if not already set), so staff don't have to enter it
    manually and it can't be backdated.

    Raises:
        ConflictException if a supplied transaction_id collides with
        another payment's.
    """
    cleaned = validate_payment_update(data)

    existing = payment_repo.find_by_id(payment_id)
    if not existing:
        raise NotFoundException("Payment record not found.")

    if 'transaction_id' in cleaned and cleaned['transaction_id']:
        if payment_repo.transaction_id_exists(
            cleaned['transaction_id'],
            exclude_id=existing['_id']
        ):
            raise ConflictException(
                f"Transaction ID '{cleaned['transaction_id']}' is already in use."
            )

    if cleaned.get('status') == PaymentStatus.PAID and not existing.get('payment_date'):
        cleaned['payment_date'] = datetime.now(timezone.utc)

    payment_repo.update_by_id(payment_id, cleaned)

    # Send notification when the payment is marked as PAID.
    if cleaned.get('status') == PaymentStatus.PAID:
        from notifications.services import notify
        from core.constants import Collections, NotificationType
        from core.repository import BaseRepository

        class _BookingLookup(BaseRepository):
            collection_name = Collections.BOOKINGS

        booking = _BookingLookup().find_one({
            'farmer_id': existing['farmer_id']
        })

        # Prefer resolving through the procurement's booking for accuracy.
        procurement = procurement_repo_ro.find_by_id(
            existing['procurement_id']
        )

        if procurement:
            booking = _BookingLookup().find_by_id(
                procurement['booking_id']
            )

        if booking and booking.get('farmer_user_id'):
            from core.serializers import serialize_document

            amount_display = existing['amount']

            notify(
                user_id=booking['farmer_user_id'],
                notification_type=NotificationType.PAYMENT_COMPLETED,
                title="Payment Processed",
                message=(
                    f"Payment of ₹{amount_display:,.2f} has been processed."
                ),
            )

    return _serialize_payment(payment_repo.find_by_id(payment_id))


def get_payment(payment_id):
    payment = payment_repo.find_by_id(payment_id)

    if not payment:
        raise NotFoundException("Payment record not found.")

    return _serialize_payment(payment)


def get_payment_by_procurement(procurement_id):
    """Used by staff to check if a completed procurement already has a payment."""
    from core.validators import validate_object_id

    procurement_object_id = validate_object_id(
        procurement_id,
        field_name="procurement"
    )

    payment = payment_repo.find_by_procurement(procurement_object_id)

    return _serialize_payment(payment) if payment else None


def list_payments(centre_id=None, status=None, page=1, page_size=20):
    """Paginated payment listing for the staff management table."""
    from core.validators import validate_object_id

    centre_object_id = (
        validate_object_id(centre_id, "centre")
        if centre_id
        else None
    )

    skip = (page - 1) * page_size

    records = payment_repo.search(
        centre_object_id,
        None,
        status,
        skip=skip,
        limit=page_size
    )

    total = payment_repo.count_search(
        centre_object_id,
        None,
        status
    )

    return {
        'payments': [
            _serialize_payment(record)
            for record in records
        ],
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(
                1,
                (total + page_size - 1) // page_size
            ),
        },
    }


def list_my_payments(farmer_user):
    """Farmer-facing: all of the authenticated farmer's payment records."""
    farmer_profile = farmer_repo_ro.find_one({
        'user_id': farmer_user.object_id
    })

    if not farmer_profile:
        raise NotFoundException("Farmer profile not found.")

    payments = payment_repo.find_by_farmer(
        farmer_profile['_id']
    )

    return [
        _serialize_payment(payment)
        for payment in payments
    ]