import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { getErrorMessage } from '../../services/api';

const INITIAL_FORM = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  confirm_password: '',
  address: '',
  village: '',
  district: '',
  state: '',
};

/**
 * Farmer self-registration form.
 *
 * Client-side validation here is for fast feedback only — the backend
 * validates everything again, which is what actually protects the data.
 */
const Register = () => {
  usePageTitle('Register');

  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasStartedFilling = Object.values(form).some(
    (value) => value.trim() !== ''
  );

  useUnsavedChangesWarning(hasStartedFilling && !isSubmitting);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    if (form.full_name.trim().length < 3) return 'Please enter your full name.';
    if (!/^[6-9]\d{9}$/.test(form.phone.trim()))
      return 'Please enter a valid 10-digit mobile number.';
    if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(form.email.trim()))
      return 'Please enter a valid email address.';
    if (form.password.length < 6)
      return 'Password must be at least 6 characters long.';
    if (form.password !== form.confirm_password)
      return 'Passwords do not match.';
    if (!form.address.trim()) return 'Please enter your address.';
    if (!form.village.trim()) return 'Please enter your village.';
    if (!form.district.trim()) return 'Please enter your district.';
    if (!form.state.trim()) return 'Please enter your state.';
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
      // confirm_password is a UI-only field — it never goes to the server.
      const { confirm_password: _ignored, ...payload } = form;
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card auth-card p-4 p-md-5">
            <h2 className="h3 fw-bold text-agri mb-1">
              Farmer Registration
            </h2>
            <p className="text-muted mb-4">
              Create your account to book procurement slots online.
            </p>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="full_name" className="form-label fw-medium">
                    Full Name *
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    className="form-control"
                    placeholder="Ramesh Kumar"
                    value={form.full_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="phone" className="form-label fw-medium">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-control"
                    placeholder="9876543210"
                    maxLength={10}
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-12">
                  <label htmlFor="email" className="form-label fw-medium">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="password" className="form-label fw-medium">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="form-control"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label
                    htmlFor="confirm_password"
                    className="form-label fw-medium"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    className="form-control"
                    placeholder="Re-enter your password"
                    value={form.confirm_password}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <hr className="my-2" />
                  <h6 className="text-muted text-uppercase small fw-bold mb-0">
                    Address Details
                  </h6>
                </div>

                <div className="col-12">
                  <label htmlFor="address" className="form-label fw-medium">
                    Address *
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    className="form-control"
                    placeholder="House number, street"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="village" className="form-label fw-medium">
                    Village *
                  </label>
                  <input
                    id="village"
                    name="village"
                    type="text"
                    className="form-control"
                    placeholder="Village name"
                    value={form.village}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="district" className="form-label fw-medium">
                    District *
                  </label>
                  <input
                    id="district"
                    name="district"
                    type="text"
                    className="form-control"
                    placeholder="District name"
                    value={form.district}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="state" className="form-label fw-medium">
                    State *
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    className="form-control"
                    placeholder="State name"
                    value={form.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-agri btn-lg w-100 mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Creating your account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="text-center text-muted mt-4 mb-0">
              Already registered?{' '}
              <Link
                to="/login"
                className="text-agri fw-semibold text-decoration-none"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;