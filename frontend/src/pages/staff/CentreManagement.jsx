import { useCallback, useEffect, useState } from 'react';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import CentreForm from '../../components/centres/CentreForm';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import { centreService } from '../../services/centreService';

/**
 * Staff/Admin procurement centre management screen.
 *
 * Covers every spec requirement from Section 6:
 *   Add, Edit, Delete, View list, Activate/Deactivate.
 *
 * This page establishes the CRUD-table pattern reused (with small
 * variations) for slots in Step 6, procurement records in Step 10, and
 * admin user/staff management in Step 14.
 */
const CentreManagement = () => {
  usePageTitle('Procurement Centres');
  const toast = useToast();

  const [centres, setCentres] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState(null);

  const loadCentres = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const isActive =
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active';

        const result = await centreService.list({
          q: debouncedSearch,
          isActive,
          page,
          pageSize: 10,
        });

        setCentres(result.centres);
        setPagination(result.pagination);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, statusFilter],
  );

  useEffect(() => {
    loadCentres(1);
  }, [loadCentres]);

  // -------------------------------------------------------------------
  // Create / Edit
  // -------------------------------------------------------------------
  const openCreateForm = () => {
    setEditingCentre(null);
    setIsFormOpen(true);
  };

  const openEditForm = (centre) => {
    setEditingCentre(centre);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (editingCentre) {
      await centreService.update(editingCentre.id, payload);
      toast.success('Centre updated successfully.');
    } else {
      await centreService.create(payload);
      toast.success('Centre created successfully.');
    }

    setIsFormOpen(false);
    setEditingCentre(null);
    loadCentres(pagination.page);
  };

  // -------------------------------------------------------------------
  // Activate / Deactivate
  // -------------------------------------------------------------------
  const handleToggleStatus = async (centre, nextValue) => {
    setTogglingId(centre.id);

    try {
      await centreService.setStatus(centre.id, nextValue);

      toast.success(
        `${centre.name} ${
          nextValue ? 'activated' : 'deactivated'
        }.`,
      );

      setCentres((current) =>
        current.map((item) =>
          item.id === centre.id
            ? { ...item, is_active: nextValue }
            : item,
        ),
      );
    } catch (toggleError) {
      toast.error(getErrorMessage(toggleError));
    } finally {
      setTogglingId(null);
    }
  };

  // -------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------
  const handleDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);

    try {
      await centreService.remove(pendingDelete.id);

      toast.success(`${pendingDelete.name} deleted.`);

      setPendingDelete(null);
      loadCentres(pagination.page);
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Procurement Centres"
        subtitle={`${pagination.total} centre(s) registered`}
      >
        <button
          className="btn btn-agri"
          onClick={openCreateForm}
        >
          + Add Centre
        </button>
      </PageHeader>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {/* Filters */}
          <div className="d-flex flex-wrap gap-3 mb-3">
            <div className="search-input-wrapper flex-grow-1">
              <span className="search-icon">🔍</span>

              <input
                type="text"
                className="form-control"
                placeholder="Search by name or location..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              className="form-select"
              style={{ maxWidth: 180 }}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => loadCentres(1)}
            />
          )}

          {isLoading ? (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Daily Capacity</th>
                    <th>Status</th>
                    <th className="text-end">
                      Actions
                    </th>
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
          ) : centres.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No centres found"
              message={
                search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter.'
                  : 'Add your first procurement centre to get started.'
              }
              actionLabel={
                !search && statusFilter === 'all'
                  ? '+ Add Centre'
                  : undefined
              }
              onAction={
                !search && statusFilter === 'all'
                  ? openCreateForm
                  : undefined
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table app-table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Contact</th>
                      <th>Daily Capacity</th>
                      <th>Status</th>
                      <th className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {centres.map((centre) => (
                      <tr key={centre.id}>
                        <td className="fw-medium">
                          {centre.name}
                        </td>

                        <td className="text-muted">
                          {centre.location}
                        </td>

                        <td>
                          {centre.contact_number}
                        </td>

                        <td>
                          {centre.daily_capacity}
                        </td>

                        <td>
                          <ToggleSwitch
                            checked={centre.is_active}
                            disabled={
                              togglingId === centre.id
                            }
                            onChange={(next) =>
                              handleToggleStatus(
                                centre,
                                next,
                              )
                            }
                            label={
                              centre.is_active
                                ? 'Active'
                                : 'Inactive'
                            }
                          />
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            onClick={() =>
                              openEditForm(centre)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setPendingDelete(centre)
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <nav className="d-flex justify-content-center mt-3">
                  <ul className="pagination mb-0">
                    {Array.from(
                      {
                        length: pagination.total_pages,
                      },
                      (_, index) => index + 1,
                    ).map((pageNumber) => (
                      <li
                        key={pageNumber}
                        className={`page-item ${
                          pageNumber === pagination.page
                            ? 'active'
                            : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            loadCentres(pageNumber)
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

      {/* Add / Edit modal */}
      <Modal
        title={
          editingCentre
            ? 'Edit Centre'
            : 'Add New Centre'
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <CentreForm
          initialValues={editingCentre}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete Procurement Centre?"
        message={
          pendingDelete
            ? `Are you sure you want to permanently delete "${pendingDelete.name}"? This cannot be undone. If this centre has slots or bookings, deletion will be blocked — deactivate it instead.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default CentreManagement;