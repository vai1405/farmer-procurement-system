import { useCallback, useEffect, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { centreService } from '../../services/centreService';
import { paymentService } from '../../services/paymentService';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '../../utils/formatters';

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'PAID', 'FAILED'];

/**
 * Staff/Admin payment tracking screen: browse all payment records and
 * advance their status as real-world payments are processed.
 */
const PaymentManagement = () => {
  usePageTitle('Payment Tracking');

  const toast = useToast();

  const [centres, setCentres] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [centreFilter, setCentreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [detailPayment, setDetailPayment] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [transactionIdDraft, setTransactionIdDraft] = useState('');

  useEffect(() => {
    centreService.listActive().then(setCentres);
  }, []);

  const loadPayments = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await paymentService.list({
          centreId: centreFilter || undefined,
          status: statusFilter || undefined,
          page,
          pageSize: 10,
        });

        setPayments(result.payments);
        setPagination(result.pagination);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    },
    [centreFilter, statusFilter],
  );

  useEffect(() => {
    loadPayments(1);
  }, [loadPayments]);

  const openDetail = (payment) => {
    setDetailPayment(payment);
    setTransactionIdDraft(payment.transaction_id || '');
  };

  const handleStatusChange = async (newStatus) => {
    if (!detailPayment) return;

    setIsUpdating(true);

    try {
      const updated = await paymentService.update(
        detailPayment.id,
        { status: newStatus },
      );

      toast.success(`Payment marked as ${newStatus}.`);

      setPayments((current) =>
        current.map((payment) =>
          payment.id === updated.id ? updated : payment,
        ),
      );

      setDetailPayment(updated);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTransactionId = async () => {
    if (!detailPayment) return;

    setIsUpdating(true);

    try {
      const updated = await paymentService.update(
        detailPayment.id,
        {
          transaction_id: transactionIdDraft.trim(),
        },
      );

      toast.success('Transaction ID updated.');

      setPayments((current) =>
        current.map((payment) =>
          payment.id === updated.id ? updated : payment,
        ),
      );

      setDetailPayment(updated);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment Tracking"
        subtitle={`${pagination.total} payment record(s)`}
      />

      <div className="alert alert-light border small">
        This module tracks payment status for record-keeping purposes only.
        No real payment gateway is integrated — no money is actually
        transferred by this system.
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={centreFilter}
                onChange={(event) =>
                  setCentreFilter(event.target.value)
                }
              >
                <option value="">All Centres</option>

                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="">All Statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => loadPayments(1)}
            />
          )}

          {isLoading ? (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Crop</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Transaction ID</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  <SkeletonTableRows
                    rows={5}
                    columns={8}
                  />
                </tbody>
              </table>
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon="💰"
              title="No payment records yet"
              message="Payment records appear here once staff create them from a completed procurement."
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table app-table align-middle">
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Crop</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Transaction ID</th>
                      <th>Status</th>
                      <th>Payment Date</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="fw-medium">
                          {payment.farmer_name}
                        </td>

                        <td>
                          {payment.crop_name} (
                          {payment.quantity} {payment.unit})
                        </td>

                        <td className="fw-semibold">
                          {formatCurrency(payment.amount)}
                        </td>

                        <td>
                          {payment.payment_method.replace(
                            '_',
                            ' ',
                          )}
                        </td>

                        <td className="text-muted small">
                          {payment.transaction_id || '—'}
                        </td>

                        <td>
                          <StatusBadge status={payment.status} />
                        </td>

                        <td className="small">
                          {payment.payment_date
                            ? formatDate(payment.payment_date)
                            : '—'}
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openDetail(payment)}
                          >
                            Manage
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
                            loadPayments(pageNumber)
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
        title="Payment Details"
        isOpen={Boolean(detailPayment)}
        onClose={() => setDetailPayment(null)}
      >
        {detailPayment && (
          <div>
            <dl className="row small mb-3">
              <dt className="col-5 text-muted fw-normal">
                Farmer
              </dt>

              <dd className="col-7 fw-medium">
                {detailPayment.farmer_name}
              </dd>

              <dt className="col-5 text-muted fw-normal">
                Amount
              </dt>

              <dd className="col-7 fw-bold text-agri">
                {formatCurrency(detailPayment.amount)}
              </dd>

              <dt className="col-5 text-muted fw-normal">
                Method
              </dt>

              <dd className="col-7">
                {detailPayment.payment_method.replace(
                  '_',
                  ' ',
                )}
              </dd>

              <dt className="col-5 text-muted fw-normal">
                Created
              </dt>

              <dd className="col-7">
                {formatDateTime(detailPayment.created_at)}
              </dd>

              {detailPayment.payment_date && (
                <>
                  <dt className="col-5 text-muted fw-normal">
                    Paid On
                  </dt>

                  <dd className="col-7">
                    {formatDateTime(
                      detailPayment.payment_date,
                    )}
                  </dd>
                </>
              )}
            </dl>

            <label
              htmlFor="txn"
              className="form-label fw-medium"
            >
              Transaction ID
            </label>

            <div className="input-group mb-4">
              <input
                id="txn"
                type="text"
                className="form-control"
                value={transactionIdDraft}
                onChange={(event) =>
                  setTransactionIdDraft(
                    event.target.value,
                  )
                }
                placeholder="Enter or update transaction ID"
              />

              <button
                className="btn btn-outline-secondary"
                onClick={handleSaveTransactionId}
                disabled={isUpdating}
              >
                Save
              </button>
            </div>

            <label className="form-label fw-medium">
              Update Status
            </label>

            <div className="d-flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`btn btn-sm ${
                    detailPayment.status === status
                      ? 'btn-agri'
                      : 'btn-outline-secondary'
                  }`}
                  disabled={
                    isUpdating ||
                    detailPayment.status === status
                  }
                  onClick={() =>
                    handleStatusChange(status)
                  }
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentManagement;