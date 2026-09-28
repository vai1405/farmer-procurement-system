import { useCallback, useEffect, useState } from 'react';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { usePageTitle } from '../../hooks/usePageTitle';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/formatters';

/**
 * Admin's system-wide user management screen: every account, any role,
 * searchable, with activate/deactivate control.
 *
 * Deliberately does NOT allow editing profile fields — that stays each
 * user's own privilege (farmers via Step 4, and staff/admin accounts
 * have no self-editable profile fields defined in the spec). This page
 * only controls account status.
 */
const UserManagement = () => {
  usePageTitle('User Management');

  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [togglingId, setTogglingId] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);

  const loadUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const isActive =
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active';

        const result = await adminService.listUsers({
          role: roleFilter || undefined,
          isActive,
          q: debouncedSearch,
          page,
          pageSize: 10,
        });

        setUsers(result.users);
        setPagination(result.pagination);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, roleFilter, statusFilter],
  );

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const requestToggle = (user, nextValue) => {
    if (!nextValue) {
      setPendingToggle({ user, nextValue });
    } else {
      applyToggle(user, nextValue);
    }
  };

  const applyToggle = async (user, nextValue) => {
    setTogglingId(user.id);

    try {
      await adminService.setUserStatus(
        user.id,
        nextValue,
      );

      toast.success(
        `${user.full_name} ${
          nextValue ? 'activated' : 'deactivated'
        }.`,
      );

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                is_active: nextValue,
              }
            : item,
        ),
      );
    } catch (toggleError) {
      toast.error(getErrorMessage(toggleError));
    } finally {
      setTogglingId(null);
      setPendingToggle(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${pagination.total} account(s)`}
      />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search name, email, or phone..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-6 col-md-4">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value)
                }
              >
                <option value="">All Roles</option>
                <option value="FARMER">Farmer</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="col-6 col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All Statuses</option>
                <option value="active">
                  Active Only
                </option>
                <option value="inactive">
                  Inactive Only
                </option>
              </select>
            </div>
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => loadUsers(1)}
            />
          )}

          {isLoading ? (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  <SkeletonTableRows
                    rows={5}
                    columns={6}
                  />
                </tbody>
              </table>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No users found"
              message="Try adjusting your filters."
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table app-table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="fw-medium">
                          {user.full_name}
                        </td>

                        <td className="text-muted small">
                          {user.email}
                        </td>

                        <td>{user.phone}</td>

                        <td>
                          <span className="badge bg-agri">
                            {user.role}
                          </span>
                        </td>

                        <td className="small">
                          {formatDate(user.created_at)}
                        </td>

                        <td>
                          <ToggleSwitch
                            checked={user.is_active}
                            disabled={
                              togglingId === user.id ||
                              user.id === currentUser?.id
                            }
                            onChange={(next) =>
                              requestToggle(
                                user,
                                next,
                              )
                            }
                            label={
                              user.is_active
                                ? 'Active'
                                : 'Inactive'
                            }
                          />

                          {user.id === currentUser?.id && (
                            <div
                              className="text-muted"
                              style={{
                                fontSize: '0.7rem',
                              }}
                            >
                              (your account)
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.total_pages > 1 && (
                <nav className="d-flex justify-content-center mt-3">
                  <ul className="pagination mb-0">
                    {Array.from(
                      {
                        length:
                          pagination.total_pages,
                      },
                      (_, index) => index + 1,
                    ).map((pageNumber) => (
                      <li
                        key={pageNumber}
                        className={`page-item ${
                          pageNumber ===
                          pagination.page
                            ? 'active'
                            : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            loadUsers(pageNumber)
                          }
                        >
                          {pageNumber}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingToggle)}
        title="Deactivate Account?"
        message={
          pendingToggle
            ? `Are you sure you want to deactivate ${pendingToggle.user.full_name}'s account? They will be unable to log in until reactivated.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
        isProcessing={
          togglingId === pendingToggle?.user?.id
        }
        onConfirm={() =>
          applyToggle(
            pendingToggle.user,
            pendingToggle.nextValue,
          )
        }
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
};

export default UserManagement;