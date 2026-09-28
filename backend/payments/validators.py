"""
Validation for payment-related payloads.
"""

from core.constants import PaymentStatus
from core.exceptions import ValidationException
from core.validators import validate_object_id, validate_required

VALID_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']

PAYMENT_REQUIRED_FIELDS = ['procurement_id', 'payment_method']


def validate_payment_create(data):
    """
    Validate a new payment record payload.

    Note: `amount` is NOT accepted here — it is copied from the linked
    procurement's total_amount by the service layer, keeping the same
    "backend is the source of truth for money" principle from Step 10.
    """
    validate_required(data, PAYMENT_REQUIRED_FIELDS)

    payment_method = str(data['payment_method']).strip().upper()
    if payment_method not in VALID_PAYMENT_METHODS:
        raise ValidationException(
            f"Invalid payment method. Allowed values: {', '.join(VALID_PAYMENT_METHODS)}."
        )

    transaction_id = str(data.get('transaction_id', '')).strip() or None

    return {
        'procurement_id': validate_object_id(data['procurement_id'], field_name="procurement"),
        'payment_method': payment_method,
        'transaction_id': transaction_id,
    }


def validate_payment_update(data):
    """
    Validate a payment update payload — primarily used to change status
    and attach a transaction ID once a payment is actually processed.
    """
    cleaned = {}

    if 'status' in data:
        status = str(data['status']).strip().upper()
        if status not in PaymentStatus.ALL:
            raise ValidationException(
                f"Invalid status. Allowed values: {', '.join(PaymentStatus.ALL)}."
            )
        cleaned['status'] = status

    if 'payment_method' in data:
        payment_method = str(data['payment_method']).strip().upper()
        if payment_method not in VALID_PAYMENT_METHODS:
            raise ValidationException(
                f"Invalid payment method. Allowed values: {', '.join(VALID_PAYMENT_METHODS)}."
            )
        cleaned['payment_method'] = payment_method

    if 'transaction_id' in data:
        transaction_id = str(data['transaction_id']).strip()
        cleaned['transaction_id'] = transaction_id or None

    if not cleaned:
        raise ValidationException("No valid fields were provided to update.")

    return cleaned