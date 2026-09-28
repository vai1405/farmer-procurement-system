import { useCallback, useEffect, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/formatters';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  role: 'STAFF',
};

/**
 * Admin screen for creating STAFF and ADMIN accounts.
 *
 * These roles cannot self-register (Step 3's deliberate design — see
 * accounts/services.py's create_privileged_user docstring), so this is
 * the only way new staff or admin accounts come into existence outside
 * of the seed_users management command.
 */
const StaffAccounts = () => {
  usePageTitle('Staff Accounts');

  const toast = useToast();

  const [staffUsers, setStaffUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStaffUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch STAFF and ADMIN separately then merge, since the listing
      // endpoint filters by a single role at a time.
      const [staffResult, adminResult] = await Promise.all([
        adminService.listUsers({ role: 'STAFF', pageSize: 100 }),
        adminService.listUsers({ role: 'ADMIN', pageSize: 100 }),
      ]);

      const merged = [...staffResult.users, ...adminResult.users].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );

      setStaffUsers(merged);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffUsers();
  }, [loadStaffUsers]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    if (form.full_name.trim().length < 3) {
      return 'Please enter a valid full name.';
    }

    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      return 'Please enter a valid 10-digit phone number.';
    }

    if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(form.email.trim())) {
      return 'Please enter a valid email.';
    }

    if (form.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      await adminService.createStaff(form);

      toast.success(
        `${form.role === 'ADMIN' ? 'Admin' : 'Staff'} account created successfully.`,
      );

      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      loadStaffUsers();
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Accounts"
        subtitle="Create and view staff and admin accounts"
      >
        <button
          className="btn btn-agri"
          onClick={() => setIsFormOpen(true)}
        >
          + Create Account
        </button>
      </PageHeader>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {error && (
            <ErrorMessage
              message={error}
              onRetry={loadStaffUsers}
            />
          )}

          {isLoading ? (
            <Loader
              message="Loading staff accounts..."
              fullPage={false}
            />
          ) : staffUsers.length === 0 ? (
            <EmptyState
              icon="🧑‍💼"
              title="No staff accounts yet"
              message="Create the first staff account to get started."
              actionLabel="+ Create Account"
              onAction={() => setIsFormOpen(true)}
            />
          ) : (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {staffUsers.map((staffUser) => (
                    <tr key={staffUser.id}>
                      <td className="fw-medium">
                        {staffUser.full_name}
                      </td>

                      <td className="text-muted small">
                        {staffUser.email}
                      </td>

                      <td>{staffUser.phone}</td>

                      <td>
                        <span
                          className={`badge ${
                            staffUser.role === 'ADMIN'
                              ? 'bg-dark'
                              : 'bg-agri'
                          }`}
                        >
                          {staffUser.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            staffUser.is_active
                              ? 'bg-success'
                              : 'bg-secondary'
                          }`}
                        >
                          {staffUser.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </td>

                      <td className="small">
                        {formatDate(staffUser.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="Create Staff / Admin Account"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="alert alert-danger py-2">
              {formError}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-medium">
              Full Name *
            </label>

            <input
              name="full_name"
              type="text"
              className="form-control"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-medium">
                Phone Number *
              </label>

              <input
                name="phone"
                type="tel"
                maxLength={10}
                className="form-control"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-medium">
                Role *
              </label>

              <select
                name="role"
                className="form-select"
                value={form.role}
                onChange={handleChange}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">
              Email Address *
            </label>

            <input
              name="email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-medium">
              Temporary Password *
            </label>

            <input
              name="password"
              type="text"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
            />

            <div className="form-text">
              Share this password with the new account holder securely;
              they can change it later.
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-agri"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Creating...'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffAccounts;