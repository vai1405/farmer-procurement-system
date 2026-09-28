import { useCallback } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import StatusBadge from '../../components/common/StatusBadge';
import { useFetch } from '../../hooks/useFetch';
import { paymentService } from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Farmer's payment history screen.
 *
 * Shows exactly the fields the spec calls for (Section 12):
 * procurement amount, payment status, transaction ID, payment date.
 */
const Payments = () => {
  usePageTitle('My Payments');
  const fetchPayments = useCallback(() => paymentService.listMine(), []);
  const { data: payments, isLoading, error, refetch } = useFetch(fetchPayments);

  if (isLoading && !payments) {
    return <Loader message="Loading your payment history..." fullPage={false} />;
  }

  if (error && !payments) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div>
      <PageHeader title="My Payments" subtitle="Payment status for your completed procurements" />

      {payments && payments.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No payment records yet"
          message="Payment records appear here once your procurement is completed and recorded by staff."
        />
      ) : (
        <div className="row g-3">
          {payments?.map((payment) => (
            <div key={payment.id} className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row align-items-center g-3">
                    <div className="col-auto text-center">
                      <div className="text-muted small text-uppercase fw-semibold">
                        Amount
                      </div>
                      <div className="fw-bold fs-4 text-agri">
                        {formatCurrency(payment.amount)}
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>

                    <div className="col">
                      <div className="fw-semibold">
                        {payment.crop_name} — {payment.quantity} {payment.unit}
                      </div>
                      <div className="text-muted small mb-2">{payment.centre_name}</div>

                      <dl className="row small mb-0">
                        <dt className="col-5 col-sm-3 text-muted fw-normal">Method</dt>
                        <dd className="col-7 col-sm-9">
                          {payment.payment_method.replace('_', ' ')}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Transaction ID
                        </dt>
                        <dd className="col-7 col-sm-9">
                          {payment.transaction_id || 'Not available'}
                        </dd>

                        <dt className="col-5 col-sm-3 text-muted fw-normal">
                          Payment Date
                        </dt>
                        <dd className="col-7 col-sm-9">
                          {payment.payment_date ? formatDate(payment.payment_date) : 'Pending'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;