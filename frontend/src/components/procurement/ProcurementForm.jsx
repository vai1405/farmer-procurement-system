import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

const EMPTY_FORM = {
  crop_name: '',
  quantity: '',
  unit: 'kg',
  price_per_unit: '',
  quality_notes: '',
};

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'tonne', label: 'Tonne' },
];

/**
 * Procurement recording form, rendered for a specific CALLED/PROCESSING
 * booking (staff use this right after calling a farmer to the counter).
 *
 * The live total shown here is a CLIENT-SIDE PREVIEW ONLY, purely for
 * staff convenience while entering figures. It is never sent to the
 * server — the backend recalculates total_amount independently from
 * quantity and price_per_unit, per the spec's requirement that totals
 * must never be trusted from the frontend.
 */
const ProcurementForm = ({ booking, onSubmit, onCancel }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasStartedFilling =
    form.crop_name.trim() !== '' ||
    form.quantity.trim() !== '' ||
    form.price_per_unit.trim() !== '' ||
    form.quality_notes.trim() !== '' ||
    form.unit !== EMPTY_FORM.unit;

  useUnsavedChangesWarning(hasStartedFilling && !isSubmitting);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const previewTotal =
    Number(form.quantity) > 0 && Number(form.price_per_unit) > 0
      ? Number(form.quantity) * Number(form.price_per_unit)
      : 0;

  const validate = () => {
    if (form.crop_name.trim().length < 2) return 'Please enter a valid crop name.';
    if (!form.quantity || Number(form.quantity) <= 0)
      return 'Quantity must be a number greater than zero.';
    if (!form.price_per_unit || Number(form.price_per_unit) <= 0)
      return 'Price per unit must be a number greater than zero.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        booking_id: booking.booking_id,
        crop_name: form.crop_name,
        quantity: Number(form.quantity),
        unit: form.unit,
        price_per_unit: Number(form.price_per_unit),
        quality_notes: form.quality_notes,
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
        <div className="d-flex justify-content-between">
          <span className="text-muted">Farmer</span>
          <span className="fw-medium">{booking.farmer_name}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted">Token</span>
          <span className="fw-medium">#{booking.token_number}</span>
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="crop_name" className="form-label fw-medium">
          Crop Name *
        </label>
        <input
          id="crop_name"
          name="crop_name"
          type="text"
          className="form-control"
          placeholder="e.g. Wheat, Rice, Maize"
          value={form.crop_name}
          onChange={handleChange}
        />
      </div>

      <div className="row g-3">
        <div className="col-md-5">
          <label htmlFor="quantity" className="form-label fw-medium">
            Quantity *
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            placeholder="e.g. 120"
            value={form.quantity}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-3">
          <label htmlFor="unit" className="form-label fw-medium">
            Unit *
          </label>
          <select
            id="unit"
            name="unit"
            className="form-select"
            value={form.unit}
            onChange={handleChange}
          >
            {UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-4">
          <label htmlFor="price_per_unit" className="form-label fw-medium">
            Price / Unit (₹) *
          </label>
          <input
            id="price_per_unit"
            name="price_per_unit"
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            placeholder="e.g. 24"
            value={form.price_per_unit}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="mb-3 mt-3">
        <label htmlFor="quality_notes" className="form-label fw-medium">
          Quality Notes{' '}
          <span className="text-muted fw-normal">(optional)</span>
        </label>
        <textarea
          id="quality_notes"
          name="quality_notes"
          className="form-control"
          rows={2}
          placeholder="e.g. Grade A, minimal moisture"
          value={form.quality_notes}
          onChange={handleChange}
        />
      </div>

      <div className="bg-agri-light rounded p-3 mb-3 d-flex justify-content-between align-items-center">
        <span className="text-muted small">
          Estimated Total (calculated on save)
        </span>
        <span className="fw-bold fs-5 text-agri">
          {formatCurrency(previewTotal)}
        </span>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-agri"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Saving...
            </>
          ) : (
            'Record Procurement'
          )}
        </button>
      </div>
    </form>
  );
};

export default ProcurementForm;