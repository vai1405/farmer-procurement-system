import { useCallback, useEffect, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import PaymentForm from '../../components/payments/PaymentForm';
import StatusBadge from '../../components/common/StatusBadge';
import { SkeletonTableRows } from '../../components/common/Skeleton';

import { usePageTitle } from '../../hooks/usePageTitle';
import { useToast } from '../../context/ToastContext';

import { getErrorMessage } from '../../services/api';
import { centreService } from '../../services/centreService';
import { paymentService } from '../../services/paymentService';
import { procurementService } from '../../services/procurementService';

import {
  formatCurrency,
  formatDate,
} from '../../utils/formatters';


/*
|--------------------------------------------------------------------------
| Procurement statuses
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
];


/*
|--------------------------------------------------------------------------
| Status labels
|--------------------------------------------------------------------------
*/

const STATUS_LABELS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
};


/*
|--------------------------------------------------------------------------
| Procurement Management
|--------------------------------------------------------------------------
*/

const ProcurementManagement = () => {
  usePageTitle('Procurement Records');

  const toast = useToast();

  /*
  |--------------------------------------------------------------------------
  | Main data
  |--------------------------------------------------------------------------
  */

  const [centres, setCentres] = useState([]);
  const [records, setRecords] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');


  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const [centreFilter, setCentreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');


  /*
  |--------------------------------------------------------------------------
  | Detail modal
  |--------------------------------------------------------------------------
  */

  const [detailRecord, setDetailRecord] = useState(null);

  const [isUpdating, setIsUpdating] = useState(false);


  /*
  |--------------------------------------------------------------------------
  | Payment
  |--------------------------------------------------------------------------
  */

  const [existingPayment, setExistingPayment] = useState(null);

  const [isCheckingPayment, setIsCheckingPayment] =
    useState(false);

  const [isPaymentFormOpen, setIsPaymentFormOpen] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | Load centres
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const loadCentres = async () => {
      try {
        const result = await centreService.listActive();

        if (mounted) {
          setCentres(result);
        }
      } catch (centreError) {
        if (mounted) {
          toast.error(
            getErrorMessage(centreError),
          );
        }
      }
    };

    loadCentres();

    return () => {
      mounted = false;
    };
  }, [toast]);


  /*
  |--------------------------------------------------------------------------
  | Load procurement records
  |--------------------------------------------------------------------------
  */

  const loadRecords = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const result =
          await procurementService.list({
            centreId:
              centreFilter || undefined,

            status:
              statusFilter || undefined,

            page,

            pageSize: 10,
          });

        setRecords(
          result.procurements || [],
        );

        setPagination(
          result.pagination || {
            page,
            total_pages: 1,
            total: 0,
          },
        );
      } catch (fetchError) {
        setError(
          getErrorMessage(fetchError),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [centreFilter, statusFilter],
  );


  /*
  |--------------------------------------------------------------------------
  | Reload when filters change
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadRecords(1);
  }, [loadRecords]);


  /*
  |--------------------------------------------------------------------------
  | Update procurement status
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = async (
    recordId,
    newStatus,
  ) => {
    if (!recordId) {
      toast.error(
        'Procurement record ID is missing.',
      );
      return;
    }

    if (!newStatus) {
      toast.error(
        'Please select a valid status.',
      );
      return;
    }

    /*
     * Prevent duplicate request.
     */
    if (isUpdating) {
      return;
    }

    /*
     * Find current record.
     */
    const currentRecord =
      records.find(
        (record) =>
          record.id === recordId,
      );

    /*
     * If the current status is already
     * the requested status, nothing to do.
     */
    if (
      currentRecord &&
      currentRecord.status === newStatus
    ) {
      toast.info(
        `Procurement is already ${STATUS_LABELS[newStatus]}.`,
      );
      return;
    }

    setIsUpdating(true);

    try {
      const updated =
        await procurementService.update(
          recordId,
          {
            status: newStatus,
          },
        );

      /*
       * Update table immediately.
       */
      setRecords((current) =>
        current.map((record) =>
          record.id === recordId
            ? updated
            : record,
        ),
      );

      /*
       * Update currently open modal.
       */
      setDetailRecord(updated);

      /*
       * Reset payment information whenever
       * status changes.
       */
      setExistingPayment(null);

      /*
       * If procurement is completed,
       * check payment again.
       */
      if (
        newStatus === 'COMPLETED'
      ) {
        await checkExistingPayment(
          updated.id,
        );
      }

      toast.success(
        `Status updated to ${STATUS_LABELS[newStatus]}.`,
      );

      /*
       * Reload current page so the table
       * remains synchronized with backend.
       */
      await loadRecords(
        pagination.page || 1,
      );
    } catch (updateError) {
      toast.error(
        getErrorMessage(updateError),
      );
    } finally {
      setIsUpdating(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Check existing payment
  |--------------------------------------------------------------------------
  */

  const checkExistingPayment =
    async (procurementId) => {
      if (!procurementId) {
        setExistingPayment(null);
        return null;
      }

      setIsCheckingPayment(true);

      try {
        const payment =
          await paymentService.getByProcurement(
            procurementId,
          );

        setExistingPayment(
          payment || null,
        );

        return payment;
      } catch (paymentError) {
        /*
         * If no payment exists, the payment
         * service may return an error.
         *
         * We intentionally don't show an error
         * here because absence of a payment is
         * a valid state.
         */
        setExistingPayment(null);

        return null;
      } finally {
        setIsCheckingPayment(false);
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Open procurement details
  |--------------------------------------------------------------------------
  */

  const openDetail = async (
    record,
  ) => {
    setDetailRecord(record);
    setExistingPayment(null);
    setIsPaymentFormOpen(false);

    /*
     * Only completed procurement can
     * have a payment.
     */
    if (
      record.status === 'COMPLETED'
    ) {
      await checkExistingPayment(
        record.id,
      );
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Close detail modal
  |--------------------------------------------------------------------------
  */

  const closeDetail = () => {
    if (isUpdating) {
      return;
    }

    setDetailRecord(null);
    setExistingPayment(null);
    setIsPaymentFormOpen(false);
  };


  /*
  |--------------------------------------------------------------------------
  | Create payment
  |--------------------------------------------------------------------------
  */

  const handleCreatePayment =
    async (payload) => {
      try {
        /*
         * Safety check:
         * payment should only be created
         * for completed procurement.
         */
        if (
          !detailRecord ||
          detailRecord.status !==
            'COMPLETED'
        ) {
          throw new Error(
            'Payment can only be created after procurement is completed.',
          );
        }

        /*
         * Check again for duplicate payment.
         */
        const alreadyExists =
          await paymentService.getByProcurement(
            detailRecord.id,
          );

        if (alreadyExists) {
          setExistingPayment(
            alreadyExists,
          );

          setIsPaymentFormOpen(false);

          toast.info(
            'A payment record already exists for this procurement.',
          );

          return;
        }
      } catch (checkError) {
        /*
         * If getByProcurement fails because
         * no payment exists, continue.
         *
         * The actual create request below
         * will handle real API errors.
         */
      }

      try {
        const payment =
          await paymentService.create(
            payload,
          );

        setExistingPayment(payment);

        setIsPaymentFormOpen(false);

        toast.success(
          'Payment record created successfully.',
        );
      } catch (paymentError) {
        toast.error(
          getErrorMessage(paymentError),
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | Payment modal
  |--------------------------------------------------------------------------
  */

  const openPaymentForm = () => {
    if (!detailRecord) {
      return;
    }

    if (
      detailRecord.status !==
      'COMPLETED'
    ) {
      toast.error(
        'Complete the procurement before creating payment.',
      );

      return;
    }

    if (existingPayment) {
      toast.info(
        'A payment record already exists.',
      );

      return;
    }

    setIsPaymentFormOpen(true);
  };


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Procurement Records"
        subtitle={`${pagination.total} record(s) on file`}
      />


      {/* ================================================================ */}
      {/* FILTERS                                                          */}
      {/* ================================================================ */}

      <div className="card border-0 shadow-sm">
        <div className="card-body">

          <div className="row g-3 mb-3">

            {/* Centre filter */}
            <div className="col-12 col-md-4">

              <label className="form-label fw-medium">
                Centre
              </label>

              <select
                className="form-select"
                value={centreFilter}
                onChange={(event) =>
                  setCentreFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All Centres
                </option>

                {centres.map(
                  (centre) => (
                    <option
                      key={centre.id}
                      value={centre.id}
                    >
                      {centre.name}
                    </option>
                  ),
                )}
              </select>

            </div>


            {/* Status filter */}
            <div className="col-12 col-md-4">

              <label className="form-label fw-medium">
                Status
              </label>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  All Statuses
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {
                        STATUS_LABELS[
                          status
                        ]
                      }
                    </option>
                  ),
                )}
              </select>

            </div>

          </div>


          {/* ============================================================ */}
          {/* ERROR                                                         */}
          {/* ============================================================ */}

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() =>
                loadRecords(1)
              }
            />
          )}


          {/* ============================================================ */}
          {/* LOADING                                                       */}
          {/* ============================================================ */}

          {isLoading ? (
            <div className="table-responsive">

              <table className="table app-table align-middle">

                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Centre</th>
                    <th>Crop</th>
                    <th>Quantity</th>
                    <th>Total Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-end">
                      Actions
                    </th>
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
          ) : records.length === 0 ? (

            <EmptyState
              icon="🌾"
              title="No procurement records yet"
              message="Records appear here once staff record procurement details from Queue Control."
            />

          ) : (

            <>
              {/* ======================================================== */}
              {/* TABLE                                                      */}
              {/* ======================================================== */}

              <div className="table-responsive">

                <table className="table app-table align-middle">

                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Centre</th>
                      <th>Crop</th>
                      <th>Quantity</th>
                      <th>Total Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>


                  <tbody>

                    {records.map(
                      (record) => (
                        <tr
                          key={record.id}
                        >

                          <td>
                            <div className="fw-medium">
                              {
                                record.farmer_name
                              }
                            </div>

                            <div className="text-muted small">
                              Token #
                              {
                                record.token_number
                              }
                            </div>
                          </td>


                          <td>
                            {
                              record.centre_name
                            }
                          </td>


                          <td>
                            {
                              record.crop_name
                            }
                          </td>


                          <td>
                            {
                              record.quantity
                            }{' '}
                            {
                              record.unit
                            }
                          </td>


                          <td className="fw-semibold">
                            {formatCurrency(
                              record.total_amount,
                            )}
                          </td>


                          <td>
                            {formatDate(
                              record.procurement_date,
                            )}
                          </td>


                          <td>
                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </td>


                          <td className="text-end">

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() =>
                                openDetail(
                                  record,
                                )
                              }
                            >
                              Manage
                            </button>

                          </td>

                        </tr>
                      ),
                    )}

                  </tbody>

                </table>

              </div>


              {/* ======================================================== */}
              {/* PAGINATION                                                 */}
              {/* ======================================================== */}

              {pagination.total_pages >
                1 && (

                <nav className="d-flex justify-content-center mt-3">

                  <ul className="pagination mb-0">

                    {Array.from(
                      {
                        length:
                          pagination.total_pages,
                      },
                      (_, index) =>
                        index + 1,
                    ).map(
                      (pageNumber) => (

                        <li
                          key={
                            pageNumber
                          }
                          className={`page-item ${
                            pageNumber ===
                            pagination.page
                              ? 'active'
                              : ''
                          }`}
                        >

                          <button
                            type="button"
                            className="page-link"
                            onClick={() =>
                              loadRecords(
                                pageNumber,
                              )
                            }
                          >
                            {
                              pageNumber
                            }
                          </button>

                        </li>

                      ),
                    )}

                  </ul>

                </nav>

              )}

            </>
          )}

        </div>
      </div>


      {/* ================================================================== */}
      {/* PROCUREMENT DETAILS MODAL                                         */}
      {/* ================================================================== */}

      <Modal
        title="Procurement Details"
        isOpen={Boolean(
          detailRecord,
        )}
        onClose={closeDetail}
      >

        {detailRecord && (

          <div>

            {/* ------------------------------------------------------------ */}
            {/* DETAILS                                                       */}
            {/* ------------------------------------------------------------ */}

            <dl className="row small mb-4">

              <dt className="col-5 text-muted fw-normal">
                Farmer
              </dt>

              <dd className="col-7 fw-medium">
                {
                  detailRecord.farmer_name
                }
              </dd>


              <dt className="col-5 text-muted fw-normal">
                Village
              </dt>

              <dd className="col-7">
                {
                  detailRecord.farmer_village ||
                  '—'
                }
              </dd>


              <dt className="col-5 text-muted fw-normal">
                Crop
              </dt>

              <dd className="col-7">
                {
                  detailRecord.crop_name
                }
              </dd>


              <dt className="col-5 text-muted fw-normal">
                Quantity
              </dt>

              <dd className="col-7">
                {
                  detailRecord.quantity
                }{' '}
                {
                  detailRecord.unit
                }
              </dd>


              <dt className="col-5 text-muted fw-normal">
                Price / Unit
              </dt>

              <dd className="col-7">
                {formatCurrency(
                  detailRecord.price_per_unit,
                )}
              </dd>


              <dt className="col-5 text-muted fw-normal">
                Total Amount
              </dt>

              <dd className="col-7 fw-bold text-agri">
                {formatCurrency(
                  detailRecord.total_amount,
                )}
              </dd>


              {detailRecord.quality_notes && (
                <>
                  <dt className="col-5 text-muted fw-normal">
                    Quality / Notes
                  </dt>

                  <dd className="col-7">
                    {
                      detailRecord.quality_notes
                    }
                  </dd>
                </>
              )}

            </dl>


            {/* ------------------------------------------------------------ */}
            {/* STATUS                                                        */}
            {/* ------------------------------------------------------------ */}

            <div className="mb-2">

              <label className="form-label fw-medium">
                Update Status
              </label>

              <div className="small text-muted mb-2">
                Follow the normal workflow:
                PENDING → IN PROGRESS → COMPLETED.
              </div>

            </div>


            <div className="d-flex flex-wrap gap-2 mb-4">

              {STATUS_OPTIONS.map(
                (status) => {

                  const isCurrent =
                    detailRecord.status ===
                    status;

                  const isDisabled =
                    isUpdating ||
                    isCurrent;

                  return (
                    <button
                      key={status}
                      type="button"
                      className={`btn btn-sm ${
                        isCurrent
                          ? 'btn-agri'
                          : 'btn-outline-secondary'
                      }`}
                      disabled={
                        isDisabled
                      }
                      onClick={() =>
                        handleStatusChange(
                          detailRecord.id,
                          status,
                        )
                      }
                    >

                      {isUpdating &&
                      !isCurrent ? (
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        />
                      ) : null}

                      {
                        STATUS_LABELS[
                          status
                        ]
                      }

                      {isCurrent
                        ? ' ✓'
                        : ''}

                    </button>
                  );
                },
              )}

            </div>


            {/* ------------------------------------------------------------ */}
            {/* PAYMENT SECTION                                               */}
            {/* ------------------------------------------------------------ */}

            {detailRecord.status ===
              'COMPLETED' && (

              <>

                <hr />

                <label className="form-label fw-medium">
                  Payment
                </label>


                {isCheckingPayment ? (

                  <Loader
                    message="Checking payment status..."
                    fullPage={false}
                  />

                ) : existingPayment ? (

                  <div className="bg-agri-light rounded p-3 small">

                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-muted">
                        Status
                      </span>

                      <StatusBadge
                        status={
                          existingPayment.status
                        }
                      />

                    </div>


                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-muted">
                        Amount
                      </span>

                      <span className="fw-medium">
                        {formatCurrency(
                          existingPayment.amount,
                        )}
                      </span>

                    </div>


                    <div className="d-flex justify-content-between mb-2">

                      <span className="text-muted">
                        Method
                      </span>

                      <span className="fw-medium">
                        {
                          existingPayment.payment_method
                        }
                      </span>

                    </div>


                    {existingPayment.transaction_id && (
                      <div className="d-flex justify-content-between">

                        <span className="text-muted">
                          Transaction ID
                        </span>

                        <span className="fw-medium">
                          {
                            existingPayment.transaction_id
                          }
                        </span>

                      </div>
                    )}

                  </div>

                ) : (

                  <button
                    type="button"
                    className="btn btn-agri w-100"
                    onClick={
                      openPaymentForm
                    }
                  >
                    + Create Payment Record
                  </button>

                )}

              </>

            )}

          </div>

        )}

      </Modal>


      {/* ================================================================== */}
      {/* PAYMENT FORM MODAL                                                 */}
      {/* ================================================================== */}

      <Modal
        title="Create Payment Record"
        isOpen={
          isPaymentFormOpen
        }
        onClose={() =>
          setIsPaymentFormOpen(false)
        }
      >

        {detailRecord && (

          <PaymentForm
            procurement={
              detailRecord
            }

            onSubmit={
              handleCreatePayment
            }

            onCancel={() =>
              setIsPaymentFormOpen(
                false,
              )
            }
          />

        )}

      </Modal>

    </div>
  );
};


export default ProcurementManagement;