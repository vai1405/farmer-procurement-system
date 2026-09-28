import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const EMPTY_FORM = { payment_method: 'BANK_TRANSFER', transaction_id: '' };

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
];

/**
 * Payment creation form, shown for a specific COMPLETED procurement
 * record. The amount is read-only here — it's the procurement's
 * backend-calculated total_amount, snapshotted by the server on save.
 */
const PaymentForm = ({ procurement, onSubmit, onCancel }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        procurement_id: procurement.id,
        payment_method: form.payment_method,
        transaction_id: form.transaction_id.trim() || undefined,
      });
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="bg-agri-light rounded p-3 mb-3 small">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Farmer</span>
          <span className="fw-medium">{procurement.farmer_name}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted">Crop</span>
          <span className="fw-medium">
            {procurement.crop_name} — {procurement.quantity} {procurement.unit}
          </span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted">Amount Due</span>
          <span className="fw-bold text-agri fs-6">
            {formatCurrency(procurement.total_amount)}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="payment_method" className="form-label fw-medium">
          Payment Method *
        </label>
        <select
          id="payment_method" name="payment_method" className="form-select"
          value={form.payment_method} onChange={handleChange}
        >
          {METHODS.map((method) => (
            <option key={method.value} value={method.value}>{method.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="transaction_id" className="form-label fw-medium">
          Transaction ID <span className="text-muted fw-normal">(optional)</span>
        </label>
        <input
          id="transaction_id" name="transaction_id" type="text" className="form-control"
          placeholder="e.g. TXN2026091501"
          value={form.transaction_id} onChange={handleChange}
        />
        <div className="form-text">
          Leave blank for cash payments or if not yet available.
        </div>
      </div>

      <div className="alert alert-light border small mb-3">
        This records payment details for tracking purposes only. No real
        money transfer is processed by this system.
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button
          type="button" className="btn btn-outline-secondary"
          onClick={onCancel} disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-agri" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Saving...
            </>
          ) : (
            'Create Payment Record'
          )}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;