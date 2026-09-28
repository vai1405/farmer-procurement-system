import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { useFetch } from '../../hooks/useFetch';
import { usePageTitle } from '../../hooks/usePageTitle';
import { staffDashboardService } from '../../services/staffDashboardService';
import { formatCurrency } from '../../utils/formatters';

/**
 * Admin landing dashboard.
 *
 * Deliberately reuses the staff operational dashboard's data (Step 13)
 * as the top section — an admin's day-to-day concern overlaps heavily
 * with staff's — then adds platform-wide quick links a staff account
 * doesn't have permission to reach.
 */
const AdminDashboard = () => {
  usePageTitle('Admin Dashboard');

  const fetchDashboard = useCallback(() => staffDashboardService.getDashboard(), []);
  const { data, isLoading, error, refetch } = useFetch(fetchDashboard);

  if (isLoading && !data) {
    return <Loader message="Loading dashboard..." fullPage={false} />;
  }

  if (error && !data) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  const {
    booking_stats: bookingStats,
    procurement_stats: procurementStats,
    payment_stats: paymentStats,
    active_centre_count: activeCentreCount,
  } = data ?? {};

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System-wide overview and controls">
        <button className="btn btn-outline-secondary" onClick={refetch} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </PageHeader>

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="📋"
            label="Today's Bookings"
            value={bookingStats?.total ?? 0}
            subtext={`${bookingStats?.completed ?? 0} completed`}
            variant="success"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🏢"
            label="Active Centres"
            value={activeCentreCount ?? 0}
            subtext="Currently operational"
            variant="primary"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="🌾"
            label="Procurement Today"
            value={procurementStats?.total_records ?? 0}
            subtext={`${procurementStats?.total_quantity ?? 0} units`}
            variant="warning"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            icon="💰"
            label="Paid Out Today"
            value={formatCurrency(paymentStats?.paid_total ?? 0)}
            subtext={`${paymentStats?.pending_count ?? 0} pending`}
            variant="info"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-semibold py-3">
              Administrative Controls
            </div>

            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <Link
                    to="/admin/users"
                    className="btn btn-outline-secondary w-100 text-start py-3"
                  >
                    👥 <span className="fw-medium ms-2">Manage Users</span>
                    <div className="small text-muted mt-1">
                      View, search, and deactivate farmer and staff accounts
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6">
                  <Link
                    to="/admin/staff"
                    className="btn btn-outline-secondary w-100 text-start py-3"
                  >
                    🧑‍💼 <span className="fw-medium ms-2">Staff Accounts</span>
                    <div className="small text-muted mt-1">
                      Create new staff or admin accounts
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6">
                  <Link
                    to="/admin/centres"
                    className="btn btn-outline-secondary w-100 text-start py-3"
                  >
                    🏢 <span className="fw-medium ms-2">Procurement Centres</span>
                    <div className="small text-muted mt-1">
                      Add, edit, and manage all centres
                    </div>
                  </Link>
                </div>

                <div className="col-12 col-sm-6">
                  <Link
                    to="/admin/reports"
                    className="btn btn-outline-secondary w-100 text-start py-3"
                  >
                    📊 <span className="fw-medium ms-2">System Reports</span>
                    <div className="small text-muted mt-1">
                      Cross-centre procurement and payment analytics
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom fw-semibold py-3">
              Shared with Staff
            </div>

            <div className="card-body d-flex flex-column gap-2">
              <Link to="/staff/queue" className="btn btn-outline-secondary text-start">
                ⏱️ Queue Control
              </Link>

              <Link to="/staff/slots" className="btn btn-outline-secondary text-start">
                📅 Slot Management
              </Link>

              <Link to="/staff/procurement" className="btn btn-outline-secondary text-start">
                🌾 Procurement Records
              </Link>

              <Link to="/staff/payments" className="btn btn-outline-secondary text-start">
                💰 Payment Tracking
              </Link>

              <Link to="/staff/farmers" className="btn btn-outline-secondary text-start">
                👥 Farmer Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;