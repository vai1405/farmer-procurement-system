import { useState } from 'react';

const EMPTY_FORM = {
  name: '',
  location: '',
  contact_number: '',
  daily_capacity: '',
};

/**
 * Shared add/edit form for procurement centres, rendered inside a Modal.
 *
 * Props:
 *   initialValues - existing centre data when editing, or null when adding
 *   onSubmit      - async (payload) => void
 *   onCancel      - () => void
 */
const CentreForm = ({ initialValues, onSubmit, onCancel }) => {
  const [form, setForm] = useState(
    initialValues
      ? {
          name: initialValues.name,
          location: initialValues.location,
          contact_number: initialValues.contact_number,
          daily_capacity: String(initialValues.daily_capacity),
        }
      : EMPTY_FORM,
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    if (form.name.trim().length < 3) return 'Centre name must be at least 3 characters.';
    if (form.location.trim().length < 3) return 'Location must be at least 3 characters.';
    if (!/^[6-9]\d{9}$/.test(form.contact_number.trim()))
      return 'Please enter a valid 10-digit contact number.';
    const capacity = Number(form.daily_capacity);
    if (!capacity || capacity <= 0) return 'Daily capacity must be a number greater than zero.';
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
        daily_capacity: Number(form.daily_capacity),
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

      <div className="mb-3">
        <label htmlFor="name" className="form-label fw-medium">
          Centre Name *
        </label>
        <input
          id="name" name="name" type="text" className="form-control"
          placeholder="e.g. Main Procurement Centre"
          value={form.name} onChange={handleChange}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="location" className="form-label fw-medium">
          Location *
        </label>
        <input
          id="location" name="location" type="text" className="form-control"
          placeholder="e.g. Kapurthala Road, Jalandhar"
          value={form.location} onChange={handleChange}
        />
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="contact_number" className="form-label fw-medium">
            Contact Number *
          </label>
          <input
            id="contact_number" name="contact_number" type="tel" maxLength={10}
            className="form-control" placeholder="9876543210"
            value={form.contact_number} onChange={handleChange}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="daily_capacity" className="form-label fw-medium">
            Daily Capacity *
          </label>
          <input
            id="daily_capacity" name="daily_capacity" type="number" min="1"
            className="form-control" placeholder="e.g. 150"
            value={form.daily_capacity} onChange={handleChange}
          />
          <div className="form-text">Maximum farmers this centre can serve per day.</div>
        </div>
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
            'Create Centre'
          )}
        </button>
      </div>
    </form>
  );
};

export default CentreForm;