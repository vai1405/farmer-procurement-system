import { useCallback, useState } from 'react';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getErrorMessage } from '../../services/api';
import { bookingService } from '../../services/bookingService';
import { formatDate, formatDateTime, formatTime, formatToken } from '../../utils/formatters';

const CANCELLABLE_STATUSES = ['BOOKED', 'WAITING'];

/**
 * Farmer's booking history and management screen.
 *
 * Shows every booking (active and past) with the ability to cancel
 * anything still in BOOKED or WAITING status.
 */
const MyBookings = () => {
  usePageTitle('My Bookings');

  const toast = useToast();

  const fetchBookings = useCallback(() => bookingService.list(), []);
  const { data: bookings, isLoading, error, refetch, setData } = useFetch(fetchBookings);

  const [pendingCancel, setPendingCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!pendingCancel) return;

    setIsCancelling(true);
    try {
      await bookingService.cancel(pendingCancel.id);
      toast.success('Booking cancelled successfully.');
      setData((current) =>
        current.map((booking) =>
          booking.id === pendingCancel.id
            ? { ...booking, status: 'CANCELLED' }
            : booking,
        ),
      );
      setPendingCancel(null);
    } catch (cancelError) {
      toast.error(getErrorMessage(cancelError));
      setPendingCancel(null);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading && !bookings) {
    return <Loader message="Loading your bookings..." fullPage={false} />;
  }

  if (error && !bookings) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div>
      <PageHeader title="My Bookings" subtitle="All your procurement slot bookings">
        <button className="btn btn-outline-secondary" onClick={refetch} disabled={isLoading}>
          ↻ Refresh
        </button>
      </PageHeader>

      {bookings && bookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No bookings yet"
          message="You haven't booked any procurement slots. Book one to get started."
          actionLabel="Book a Slot"
          actionTo="/book-slot"
        />
      ) : (
        <div className="row g-3">
          {bookings?.map((booking) => {
            const canCancel = CANCELLABLE_STATUSES.includes(booking.status);

            return (
              <div key={booking.id} className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="row align-items-center g-3">
                      <div className="col-auto text-center">
                        <div className="text-muted small text-uppercase fw-semibold">
                          Token
                        </div>
                        <div className="fw-bold fs-3 text-agri">
                          {formatToken(booking.token_number)}
                        </div>
                        <StatusBadge status={booking.status} />
                      </div>

                      <div className="col">
                        <div className="fw-semibold">{booking.centre?.name}</div>
                        <div className="text-muted small mb-2">
                          {booking.centre?.location}
                        </div>
                        <div className="d-flex flex-wrap gap-3 small">
                          <span>📅 {formatDate(booking.slot?.date)}</span>
                          <span>
                            🕐 {formatTime(booking.slot?.start_time)} –{' '}
                            {formatTime(booking.slot?.end_time)}
                          </span>
                          <span>👥 Queue position: {booking.queue_position}</span>
                        </div>
                        <div className="text-muted small mt-1">
                          Booked on {formatDateTime(booking.created_at)}
                        </div>
                      </div>

                      {canCancel && (
                        <div className="col-auto">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setPendingCancel(booking)}
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingCancel)}
        title="Cancel Booking?"
        message={
          pendingCancel
            ? `Are you sure you want to cancel your booking (Token #${pendingCancel.token_number})? This will free up your spot for another farmer.`
            : ''
        }
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
        isProcessing={isCancelling}
        onConfirm={handleCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
};

export default MyBookings;