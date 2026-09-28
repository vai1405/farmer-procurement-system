import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getErrorMessage } from '../../services/api';
import { ROLE_HOME_ROUTE } from '../../utils/constants';

/**
 * Login page shared by all three roles.
 *
 * A "Staff / Admin portal" toggle switches which backend endpoint is
 * used, so farmers cannot sign in through the staff portal.
 */
const Login = () => {
  usePageTitle('Sign In');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [staffPortal, setStaffPortal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.identifier.trim() || !form.password) {
      setError('Please enter your credentials.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login(form, { staffPortal });
      // Send the user back where they were headed, or to their dashboard.
      const redirectTo =
        location.state?.from?.pathname ??
        ROLE_HOME_ROUTE[user.role] ??
        '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid auth-wrapper">
      <div className="row g-0 min-vh-100">
        {/* Brand panel — hidden on small screens to keep the form prominent */}
        <div className="col-lg-6 auth-brand-panel d-none d-lg-flex flex-column justify-content-center p-5">
          <h1 className="display-5 fw-bold mb-3">
            🌾 Smart Farmer Procurement
          </h1>
          <p className="lead mb-4 opacity-75">
            Book your procurement slot online, track your queue position in
            real time, and follow your payment status — all from your phone.
          </p>
          <ul className="list-unstyled fs-5">
            <li className="mb-2">✔ No more long waiting lines</li>
            <li className="mb-2">✔ Live token and queue updates</li>
            <li className="mb-2">✔ Transparent payment tracking</li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center p-4">
          <div
            className="card auth-card p-4 p-md-5 w-100"
            style={{ maxWidth: 460 }}
          >
            <h2 className="h3 fw-bold text-agri mb-1">Sign in</h2>
            <p className="text-muted mb-4">
              {staffPortal
                ? 'Staff and administrator access'
                : 'Enter your email or phone number to continue'}
            </p>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label
                  htmlFor="identifier"
                  className="form-label fw-medium"
                >
                  Email or Phone Number
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="you@example.com or 9876543210"
                  value={form.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>

              <div className="mb-3">
                <label
                  htmlFor="password"
                  className="form-label fw-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-check mb-4">
                <input
                  id="staffPortal"
                  type="checkbox"
                  className="form-check-input"
                  checked={staffPortal}
                  onChange={(event) =>
                    setStaffPortal(event.target.checked)
                  }
                />
                <label
                  htmlFor="staffPortal"
                  className="form-check-label text-muted"
                >
                  I am staff or an administrator
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-agri btn-lg w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-muted mt-4 mb-0">
              New farmer?{' '}
              <Link
                to="/register"
                className="text-agri fw-semibold text-decoration-none"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;