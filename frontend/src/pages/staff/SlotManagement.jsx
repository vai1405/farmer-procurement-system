import { useCallback, useEffect, useState } from 'react';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import SlotAvailability from '../../components/slots/SlotAvailability';
import SlotForm from '../../components/slots/SlotForm';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { centreService } from '../../services/centreService';
import { slotService } from '../../services/slotService';
import { formatDate } from '../../utils/formatters';

/**
 * Staff/Admin slot management screen.
 *
 * Structurally similar to CentreManagement (Step 5) — same CRUD-table
 * pattern — with the addition of a centre filter and date-range filter,
 * and the availability bar in place of a plain field.
 */
const SlotManagement = () => {
  usePageTitle('Procurement Slots');
  const toast = useToast();

  const [centres, setCentres] = useState([]);
  const [slots, setSlots] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [centreFilter, setCentreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    centreService.listActive().then(setCentres);
  }, []);

  const loadSlots = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await slotService.list({
          centreId: centreFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status:
            statusFilter === 'all'
              ? undefined
              : statusFilter.toUpperCase(),
          page,
          pageSize: 10,
        });

        setSlots(result.slots);
        setPagination(result.pagination);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    },
    [centreFilter, dateFrom, dateTo, statusFilter],
  );

  useEffect(() => {
    loadSlots(1);
  }, [loadSlots]);

  const openCreateForm = () => {
    setEditingSlot(null);
    setIsFormOpen(true);
  };

  const openEditForm = (slot) => {
    setEditingSlot(slot);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (editingSlot) {
      await slotService.update(editingSlot.id, payload);
      toast.success('Slot updated successfully.');
    } else {
      await slotService.create(payload);
      toast.success('Slot created successfully.');
    }

    setIsFormOpen(false);
    setEditingSlot(null);
    loadSlots(pagination.page);
  };

  const handleToggleStatus = async (slot, nextValue) => {
    setTogglingId(slot.id);

    try {
      await slotService.setStatus(slot.id, nextValue);

      toast.success(
        `Slot ${nextValue ? 'activated' : 'deactivated'}.`,
      );

      setSlots((current) =>
        current.map((item) =>
          item.id === slot.id
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

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);

    try {
      await slotService.remove(pendingDelete.id);

      toast.success('Slot deleted.');

      setPendingDelete(null);
      loadSlots(pagination.page);
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
        title="Procurement Slots"
        subtitle={`${pagination.total} slot(s) scheduled`}
      >
        <button
          className="btn btn-agri"
          onClick={openCreateForm}
          disabled={centres.length === 0}
        >
          + Add Slot
        </button>
      </PageHeader>

      {centres.length === 0 && (
        <div className="alert alert-warning">
          You need at least one active procurement centre before you
          can create slots.{' '}
          <a href="/staff/centres">
            Add a centre first.
          </a>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {/* Filters */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-3">
              <select
                className="form-select"
                value={centreFilter}
                onChange={(event) =>
                  setCentreFilter(event.target.value)
                }
              >
                <option value="">All Centres</option>

                {centres.map((centre) => (
                  <option
                    key={centre.id}
                    value={centre.id}
                  >
                    {centre.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-3">
              <input
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                placeholder="From date"
              />
            </div>

            <div className="col-6 col-md-3">
              <input
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                placeholder="To date"
              />
            </div>

            <div className="col-12 col-md-3">
              <select
                className="form-select"
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
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => loadSlots(1)}
            />
          )}

          {isLoading ? (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Centre</th>
                    <th>Date</th>
                    <th>Time &amp; Availability</th>
                    <th>Status</th>
                    <th className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <SkeletonTableRows
                    rows={5}
                    columns={5}
                  />
                </tbody>
              </table>
            </div>
          ) : slots.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No slots found"
              message="Create a slot to let farmers start booking."
              actionLabel={
                centres.length > 0
                  ? '+ Add Slot'
                  : undefined
              }
              onAction={
                centres.length > 0
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
                      <th>Centre</th>
                      <th>Date</th>
                      <th>Time &amp; Availability</th>
                      <th>Status</th>
                      <th className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {slots.map((slot) => (
                      <tr key={slot.id}>
                        <td>
                          <div className="fw-medium">
                            {slot.centre_name}
                          </div>

                          <div className="text-muted small">
                            {slot.centre_location}
                          </div>
                        </td>

                        <td>
                          {formatDate(slot.date)}
                        </td>

                        <td style={{ minWidth: 180 }}>
                          <SlotAvailability
                            slot={slot}
                            compact
                          />
                        </td>

                        <td>
                          <div className="d-flex flex-column gap-1">
                            {slot.is_full && (
                              <StatusBadge status="FULL" />
                            )}

                            <ToggleSwitch
                              checked={slot.is_active}
                              disabled={
                                togglingId === slot.id
                              }
                              onChange={(next) =>
                                handleToggleStatus(
                                  slot,
                                  next,
                                )
                              }
                              label={
                                slot.is_active
                                  ? 'Active'
                                  : 'Inactive'
                              }
                            />
                          </div>
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            onClick={() =>
                              openEditForm(slot)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              setPendingDelete(slot)
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
                            loadSlots(pageNumber)
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

      <Modal
        title={
          editingSlot
            ? 'Edit Slot'
            : 'Add New Slot'
        }
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      >
        <SlotForm
          initialValues={editingSlot}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete Procurement Slot?"
        message="Are you sure you want to permanently delete this slot? This cannot be undone. If this slot has bookings, deletion will be blocked."
        confirmLabel="Delete"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default SlotManagement;