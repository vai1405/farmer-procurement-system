import { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonStatRow } from '../../components/common/Skeleton';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import ConnectionStatus from '../../components/queue/ConnectionStatus';
import { useFetch } from '../../hooks/useFetch';
import { useQueueSocket } from '../../hooks/useQueueSocket';
import { usePageTitle } from '../../hooks/usePageTitle';
import { farmerService } from '../../services/farmerService';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
  formatToken,
} from '../../utils/formatters';

/**
 * Farmer dashboard.
 *
 * Active bookings:
 * - Live queue
 * - WebSocket updates
 *
 * Completed bookings:
 * - Booking/token remains visible
 * - Procurement remains visible
 * - Payment remains visible
 * - No active queue is shown
 */
const FarmerDashboard = () => {
  usePageTitle('Dashboard');

  const fetchDashboard = useCallback(
    () => farmerService.getDashboard(),
    [],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useFetch(fetchDashboard);

  /*
   * IMPORTANT:
   *
   * has_active_booking is only for the LIVE queue.
   *
   * A completed booking is not active anymore, but the booking
   * itself still exists and must remain visible on the dashboard.
   */
  const hasActiveBooking =
    data?.has_active_booking === true;

  const hasBooking =
    Boolean(data?.booking);

  /*
   * WebSocket is required only for an active booking.
   *
   * Completed bookings should not open a queue WebSocket.
   */
  const socketSlotId = hasActiveBooking
    ? data?.booking?.slot_id
    : null;

  const {
    queueData: liveQueue,
    connectionStatus,
  } = useQueueSocket(socketSlotId);

  /*
   * Refresh the REST dashboard whenever live queue data changes.
   * This keeps procurement/payment information synchronized.
   */
  useEffect(() => {
    if (liveQueue) {
      refetch();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    liveQueue?.current_token,
    liveQueue?.waiting_count,
  ]);

  /*
   * Initial loading state
   */
  if (isLoading && !data) {
    return (
      <div>
        <div className="mb-4">
          <div className="placeholder-glow">
            <span
              className="placeholder col-4 mb-2"
              style={{ height: '1.75rem' }}
            />

            <br />

            <span
              className="placeholder col-6"
              style={{ height: '1rem' }}
            />
          </div>
        </div>

        <SkeletonStatRow count={6} />
      </div>
    );
  }

  /*
   * Initial API error
   */
  if (error && !data) {
    return (
      <ErrorMessage
        message={error}
        onRetry={refetch}
      />
    );
  }

  const {
    farmer,
    booking,
    procurement,
    payment,
    statistics,
  } = data ?? {};

  /*
   * Queue information is only relevant for an ACTIVE booking.
   *
   * For a completed booking:
   * queue = null
   */
  const queue =
    hasActiveBooking && liveQueue
      ? {
          your_token: booking?.token_number,

          current_token:
            liveQueue.current_token,

          people_before_you:
            liveQueue.waiting.filter(
              (item) =>
                item.queue_position <
                (booking?.queue_position ??
                  Infinity),
            ).length,

          estimated_wait_minutes:
            liveQueue.currently_serving.some(
              (item) =>
                item.booking_id ===
                booking?.booking_id,
            )
              ? 0
              : liveQueue.waiting.filter(
                  (item) =>
                    item.queue_position <
                    (booking?.queue_position ??
                      Infinity),
                ).length * 5,
        }
      : hasActiveBooking
        ? data?.queue
        : null;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${
          farmer?.full_name ?? 'Farmer'
        }`}
        subtitle={
          farmer?.village
            ? `${farmer.village}, ${
                farmer.district
              }, ${farmer.state}`
            : 'Your procurement overview'
        }
      >
        {/* WebSocket status only for active bookings */}
        {hasActiveBooking && (
          <ConnectionStatus
            status={connectionStatus}
          />
        )}

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={refetch}
          disabled={isLoading}
        >
          {isLoading
            ? 'Refreshing...'
            : '↻ Refresh'}
        </button>
      </PageHeader>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={refetch}
        />
      )}

      <div className="row g-3 mb-4">

        {/* ======================================================= */}
        {/* YOUR TOKEN                                              */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="🎫"
            label="Your Token"
            value={
              hasBooking
                ? formatToken(
                    booking?.token_number,
                  )
                : 'No booking'
            }
            subtext={
              hasBooking
                ? booking?.centre_name
                : 'Book a slot to get a token'
            }
            variant="success"
            isLoading={isLoading}
          />
        </div>

        {/* ======================================================= */}
        {/* CURRENT TOKEN                                            */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="📢"
            label="Current Token"
            value={
              hasActiveBooking
                ? queue?.current_token
                  ? formatToken(
                      queue.current_token,
                    )
                  : 'Not started'
                : '—'
            }
            subtext={
              hasActiveBooking
                ? 'Now being served'
                : 'No active queue'
            }
            variant="info"
            isLoading={isLoading}
          />
        </div>

        {/* ======================================================= */}
        {/* PEOPLE BEFORE YOU                                        */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="👥"
            label="People Before You"
            value={
              hasActiveBooking
                ? queue?.people_before_you ?? 0
                : '—'
            }
            subtext={
              hasActiveBooking
                ? queue?.people_before_you === 0
                  ? 'You are next!'
                  : 'Farmers ahead in the queue'
                : 'Queue completed'
            }
            variant="warning"
            isLoading={isLoading}
          />
        </div>

        {/* ======================================================= */}
        {/* ESTIMATED WAITING TIME                                   */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="⏱️"
            label="Estimated Waiting Time"
            value={
              hasActiveBooking
                ? formatDuration(
                    queue?.estimated_wait_minutes,
                  )
                : '—'
            }
            subtext={
              hasActiveBooking
                ? 'Approximate, based on queue length'
                : 'No active queue'
            }
            variant="primary"
            isLoading={isLoading}
          />
        </div>

        {/* ======================================================= */}
        {/* PROCUREMENT STATUS                                       */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="🌾"
            label="Procurement Status"
            value={
              procurement?.exists ? (
                <StatusBadge
                  status={procurement.status}
                  className="fs-6"
                />
              ) : (
                'Not started'
              )
            }
            subtext={
              procurement?.exists
                ? `${procurement.crop_name} · ${procurement.quantity} ${procurement.unit}`
                : 'Recorded after your procurement'
            }
            variant="success"
            isLoading={isLoading}
          />
        </div>

        {/* ======================================================= */}
        {/* PAYMENT STATUS                                           */}
        {/* ======================================================= */}

        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            icon="💰"
            label="Payment Status"
            value={
              <StatusBadge
                status={
                  payment?.status ??
                  'PENDING'
                }
                className="fs-6"
              />
            }
            subtext={
              payment?.exists
                ? `${formatCurrency(
                    payment.amount ?? 0,
                  )} · ${
                    payment.payment_method ??
                    '—'
                  }`
                : 'Shown after procurement is completed'
            }
            variant="warning"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOOKING + ACTIVITY                                        */}
      {/* ========================================================= */}

      <div className="row g-3">

        {/* ======================================================= */}
        {/* BOOKING DETAILS                                          */}
        {/* ======================================================= */}

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">

            <div className="card-header bg-white border-bottom fw-semibold py-3">
              {hasActiveBooking
                ? 'Upcoming Booking'
                : hasBooking
                  ? 'Booking Details'
                  : 'Upcoming Booking'}
            </div>

            <div className="card-body">

              {hasBooking ? (
                <div className="row align-items-center g-4">

                  {/* Token */}
                  <div className="col-auto text-center">

                    <div className="text-muted small text-uppercase fw-semibold">
                      Token
                    </div>

                    <div className="token-display">
                      {formatToken(
                        booking?.token_number,
                      )}
                    </div>

                    <StatusBadge
                      status={booking?.status}
                      className="mt-2"
                    />

                  </div>

                  {/* Booking information */}
                  <div className="col">

                    <dl className="row mb-0 small">

                      <dt className="col-5 text-muted fw-normal">
                        Centre
                      </dt>

                      <dd className="col-7 fw-medium">
                        {booking?.centre_name ??
                          '—'}
                      </dd>

                      <dt className="col-5 text-muted fw-normal">
                        Location
                      </dt>

                      <dd className="col-7">
                        {booking?.centre_location ??
                          '—'}
                      </dd>

                      <dt className="col-5 text-muted fw-normal">
                        Date
                      </dt>

                      <dd className="col-7 fw-medium">
                        {formatDate(
                          booking?.date,
                        )}
                      </dd>

                      <dt className="col-5 text-muted fw-normal">
                        Time
                      </dt>

                      <dd className="col-7">
                        {formatTime(
                          booking?.start_time,
                        )}{' '}
                        –{' '}
                        {formatTime(
                          booking?.end_time,
                        )}
                      </dd>

                      <dt className="col-5 text-muted fw-normal">
                        Queue Position
                      </dt>

                      <dd className="col-7">
                        {booking?.queue_position ??
                          '—'}
                      </dd>

                    </dl>

                    {/* Completed booking message */}
                    {!hasActiveBooking && (
                      <div className="alert alert-success mt-3 mb-0 py-2 small">
                        Your procurement process
                        for this booking has been
                        completed.
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <EmptyState
                  icon="📅"
                  title="No upcoming booking"
                  message="Book a procurement slot to receive your token number and track your position in the queue."
                  actionLabel="Book a Slot"
                  actionTo="/book-slot"
                />
              )}

            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* YOUR ACTIVITY                                            */}
        {/* ======================================================= */}

        <div className="col-12 col-lg-5">

          <div className="card border-0 shadow-sm h-100">

            <div className="card-header bg-white border-bottom fw-semibold py-3">
              Your Activity
            </div>

            <div className="card-body">

              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted">
                  Total Bookings
                </span>

                <span className="fw-bold fs-5">
                  {statistics?.total_bookings ??
                    0}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="text-muted">
                  Completed
                </span>

                <span className="fw-bold fs-5">
                  {statistics?.completed_bookings ??
                    0}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="text-muted">
                  Total Earnings
                </span>

                <span className="fw-bold fs-5 text-agri">
                  {formatCurrency(
                    statistics?.total_earnings ??
                      0,
                  )}
                </span>
              </div>

              <Link
                to="/profile"
                className="btn btn-outline-secondary w-100 mt-3"
              >
                View My Profile
              </Link>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;