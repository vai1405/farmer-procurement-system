import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import StatCard from '../../components/common/StatCard';
import { useFetch } from '../../hooks/useFetch';
import { staffDashboardService } from '../../services/staffDashboardService';
import { formatCurrency, formatTime } from '../../utils/formatters';

/**
 * Staff/Admin operational overview.
 *
 * Read-only aggregation (Step 13) built the same way as the farmer
 * dashboard in Step 4 — one API call, honest empty states, and quick
 * links straight into the tools staff actually use day to day.
 */
const StaffDashboard = () => {
  usePageTitle('Staff Dashboard');
  const fetchDashboard = useCallback(() => staffDashboardService.getDashboard(), []);
  const { data, isLoading, error, refetch } = useFetch(fetchDashboard);

  if (isLoading && !data) {
    return <Loader message="Loading dashboard..." fullPage={false} />;
  }

  if (error && !data) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  const { booking_stats: bookingStats, active_slots: activeSlots,
    procurement_stats: procurementStats, payment_stats: paymentStats,
    active_centre_count: activeCentreCount } = data ?? {};

  return (
    <div>
      <PageHeader title="Staff Dashboard" subtitle="Today's operational overview">
        <button className="btn btn-outline-secondary" onClick={refetch} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </PageHeader>

      {/* Top stat row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="📋"
            label="Today's Bookings"
            value={bookingStats?.total ?? 0}
            subtext={`${bookingStats?.waiting ?? 0} waiting · ${bookingStats?.in_service ?? 0} in service`}
            variant="success"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="✅"
            label="Completed Today"
            value={bookingStats?.completed ?? 0}
            subtext={`${bookingStats?.cancelled ?? 0} cancelled`}
            variant="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🌾"
            label="Procurement Records"
            value={procurementStats?.total_records ?? 0}
            subtext={`${procurementStats?.total_quantity ?? 0} units recorded today`}
            variant="warning"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="💰"
            label="Paid Out Today"
            value={formatCurrency(paymentStats?.paid_total ?? 0)}
            subtext={`${paymentStats?.pending_count ?? 0} payment(s) pending`}
            variant="info"
          />
        </div>
      </div>

      <div className="row g-4">
        {/* Active queues table */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-semibold py-3 d-flex justify-content-between align-items-center">
              <span>Active Queues Today ({activeCentreCount ?? 0} centre(s) active)</span>
              <Link to="/staff/queue" className="btn btn-sm btn-agri">
                Open Queue Control
              </Link>
            </div>
            <div className="card-body p-0">
              {!activeSlots || activeSlots.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No active slots scheduled for today.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table app-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Centre</th>
                        <th>Time</th>
                        <th>Current Token</th>
                        <th>Waiting</th>
                        <th>Booked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSlots.map((slot) => (
                        <tr key={slot.slot_id}>
                          <td className="fw-medium">{slot.centre_name}</td>
                          <td>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</td>
                          <td>
                            {slot.current_token ? (
                              <span className="badge bg-info">#{slot.current_token}</span>
                            ) : (
                              <span className="text-muted">Not started</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${slot.waiting_count > 0 ? 'bg-warning' : 'bg-secondary'}`}>
                              {slot.waiting_count}
                            </span>
                          </td>
                          <td>{slot.booked_count}/{slot.max_farmers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-semibold py-3">
              Quick Actions
            </div>
            <div className="card-body d-flex flex-column gap-2">
              <Link to="/staff/queue" className="btn btn-outline-secondary text-start">
                ⏱️ Manage Live Queue
              </Link>
              <Link to="/staff/slots" className="btn btn-outline-secondary text-start">
                📅 Create New Slot
              </Link>
              <Link to="/staff/procurement" className="btn btn-outline-secondary text-start">
                🌾 Review Procurement Records
              </Link>
              <Link to="/staff/payments" className="btn btn-outline-secondary text-start">
                💰 Track Payments
              </Link>
              <Link to="/staff/farmers" className="btn btn-outline-secondary text-start">
                👥 Search Farmers
              </Link>
              <Link to="/staff/centres" className="btn btn-outline-secondary text-start">
                🏢 Manage Centres
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;