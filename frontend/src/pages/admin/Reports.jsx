import { useCallback, useEffect, useState } from 'react';

import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getErrorMessage } from '../../services/api';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

/**
 * Admin system-wide reports screen: cross-centre aggregation over an
 * optional date range, built on top of reports_service.py (Step 14).
 */
const Reports = () => {
  usePageTitle('System Reports');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await adminService.getReport({ dateFrom, dateTo });
      setReport(result);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div>
      <PageHeader
        title="System Reports"
        subtitle="Cross-centre procurement and payment analytics"
      />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-6 col-md-4">
              <label className="form-label fw-medium">
                From Date
              </label>

              <input
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
              />
            </div>

            <div className="col-6 col-md-4">
              <label className="form-label fw-medium">
                To Date
              </label>

              <input
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
              />
            </div>

            <div className="col-12 col-md-4">
              <button
                className="btn btn-agri w-100"
                onClick={loadReport}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply Filter'}
              </button>
            </div>
          </div>

          <div className="form-text mt-2">
            Leave both dates blank for an all-time report.
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={loadReport}
        />
      )}

      {isLoading && !report ? (
        <Loader
          message="Generating report..."
          fullPage={false}
        />
      ) : report ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="👨‍🌾"
                label="Total Farmers"
                value={report.platform_totals.total_farmers}
                variant="success"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="🧑‍💼"
                label="Total Staff"
                value={report.platform_totals.total_staff}
                variant="primary"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="🏢"
                label="Centres"
                value={`${report.platform_totals.active_centres}/${report.platform_totals.total_centres}`}
                subtext="Active / Total"
                variant="warning"
              />
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                icon="💰"
                label="Total Paid"
                value={formatCurrency(
                  report.payment_summary.total_paid_amount,
                )}
                subtext={`${report.payment_summary.pending_count} pending`}
                variant="info"
              />
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom fw-semibold py-3">
                  Procurement by Crop
                </div>

                <div className="card-body p-0">
                  {report.procurement_summary.by_crop.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      No procurement records in this range.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table app-table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Crop</th>
                            <th>Quantity</th>
                            <th>Records</th>
                            <th>Total Value</th>
                          </tr>
                        </thead>

                        <tbody>
                          {report.procurement_summary.by_crop.map(
                            (row) => (
                              <tr key={row.crop_name}>
                                <td className="fw-medium">
                                  {row.crop_name}
                                </td>

                                <td>{row.total_quantity}</td>

                                <td>{row.record_count}</td>

                                <td className="fw-semibold">
                                  {formatCurrency(row.total_value)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-bottom fw-semibold py-3">
                  Per-Centre Breakdown
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table app-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Centre</th>
                          <th>Bookings</th>
                          <th>Procurement Value</th>
                        </tr>
                      </thead>

                      <tbody>
                        {report.centre_breakdown.map((centre) => (
                          <tr key={centre.centre_id}>
                            <td>
                              <div className="fw-medium">
                                {centre.centre_name}
                              </div>

                              {!centre.is_active && (
                                <span className="badge bg-secondary small">
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td>{centre.booking_count}</td>

                            <td className="fw-semibold">
                              {formatCurrency(
                                centre.procurement_value,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Reports;