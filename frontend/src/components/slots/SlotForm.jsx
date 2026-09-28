import { useEffect, useState } from 'react';
import { centreService } from '../../services/centreService';

const EMPTY_FORM = {
  centre_id: '',
  date: '',
  start_time: '',
  end_time: '',
  max_farmers: '',
};

/**
 * Shared add/edit form for procurement slots, rendered inside a Modal.
 *
 * When editing, centre_id and date are locked once the slot has any
 * bookings — the backend enforces this too, but disabling the fields
 * here gives immediate visual feedback instead of a failed submit.
 */
const SlotForm = ({ initialValues, defaultCentreId, onSubmit, onCancel }) => {
  const [centres, setCentres] = useState([]);
  const [isLoadingCentres, setIsLoadingCentres] = useState(true);

  const [form, setForm] = useState(
    initialValues
      ? {
          centre_id: initialValues.centre_id,
          date: initialValues.date?.slice(0, 10) ?? '',
          start_time: initialValues.start_time,
          end_time: initialValues.end_time,
          max_farmers: String(initialValues.max_farmers),
        }
      : { ...EMPTY_FORM, centre_id: defaultCentreId ?? '' },
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasBookings = Boolean(initialValues && initialValues.booked_count > 0);

  useEffect(() => {
    centreService
      .listActive()
      .then(setCentres)
      .finally(() => setIsLoadingCentres(false));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    if (!form.centre_id) return 'Please select a procurement centre.';
    if (!form.date) return 'Please select a date.';
    if (!form.start_time) return 'Please select a start time.';
    if (!form.end_time) return 'Please select an end time.';
    if (form.end_time <= form.start_time) return 'End time must be after start time.';
    const max = Number(form.max_farmers);
    if (!max || max <= 0) return 'Maximum farmers must be a number greater than zero.';
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
        ...form,
        max_farmers: Number(form.max_farmers),
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

      {hasBookings && (
        <div className="alert alert-warning py-2">
          This slot has {initialValues.booked_count} booking(s). Centre and date cannot
          be changed, and capacity cannot go below {initialValues.booked_count}.
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="centre_id" className="form-label fw-medium">
          Procurement Centre *
        </label>
        <select
          id="centre_id" name="centre_id" className="form-select"
          value={form.centre_id} onChange={handleChange}
          disabled={isLoadingCentres || hasBookings}
        >
          <option value="">
            {isLoadingCentres ? 'Loading centres...' : 'Select a centre'}
          </option>
          {centres.map((centre) => (
            <option key={centre.id} value={centre.id}>
              {centre.name} — {centre.location}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="date" className="form-label fw-medium">
          Date *
        </label>
        <input
          id="date" name="date" type="date" className="form-control"
          value={form.date} onChange={handleChange}
          min={new Date().toISOString().slice(0, 10)}
          disabled={hasBookings}
        />
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="start_time" className="form-label fw-medium">
            Start Time *
          </label>
          <input
            id="start_time" name="start_time" type="time" className="form-control"
            value={form.start_time} onChange={handleChange}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="end_time" className="form-label fw-medium">
            End Time *
          </label>
          <input
            id="end_time" name="end_time" type="time" className="form-control"
            value={form.end_time} onChange={handleChange}
          />
        </div>
      </div>

      <div className="mb-1 mt-3">
        <label htmlFor="max_farmers" className="form-label fw-medium">
          Maximum Farmers *
        </label>
        <input
          id="max_farmers" name="max_farmers" type="number" min="1"
          className="form-control" placeholder="e.g. 30"
          value={form.max_farmers} onChange={handleChange}
        />
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
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
          ) : initialValues ? (
            'Save Changes'
          ) : (
            'Create Slot'
          )}
        </button>
      </div>
    </form>
  );
};

export default SlotForm;