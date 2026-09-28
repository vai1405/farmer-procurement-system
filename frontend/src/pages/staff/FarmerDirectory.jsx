import { useCallback, useEffect, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../services/api';
import { staffDashboardService } from '../../services/staffDashboardService';
import { formatDate } from '../../utils/formatters';

/**
 * Staff/Admin farmer directory — read-only search and history lookup.
 *
 * Staff can view a farmer's contact details and recent bookings, but
 * cannot edit anything here — a farmer's own profile remains theirs to
 * manage (Step 4's ProfileView), consistent with the spec's separation
 * of farmer self-service from staff oversight.
 */
const FarmerDirectory = () => {
  usePageTitle('Farmer Directory');

  const [farmers, setFarmers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [detailFarmer, setDetailFarmer] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadFarmers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');

      try {
        const result = await staffDashboardService.listFarmers({
          q: debouncedSearch,
          page,
          pageSize: 10,
        });

        setFarmers(result.farmers);
        setPagination(result.pagination);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    loadFarmers(1);
  }, [loadFarmers]);

  const openDetail = async (farmer) => {
    setIsLoadingDetail(true);

    setDetailFarmer({
      ...farmer,
      recent_bookings: [],
    });

    try {
      const full = await staffDashboardService.getFarmer(
        farmer.id,
      );

      setDetailFarmer(full);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Farmer Directory"
        subtitle={`${pagination.total} registered farmer(s)`}
      />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="search-input-wrapper mb-3">
            <span className="search-icon">🔍</span>

            <input
              type="text"
              className="form-control"
              placeholder="Search by name, phone, or village..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => loadFarmers(1)}
            />
          )}

          {isLoading ? (
            <div className="table-responsive">
              <table className="table app-table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Village</th>
                    <th>District</th>
                    <th>Bookings</th>
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
          ) : farmers.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No farmers found"
              message={
                search
                  ? 'Try a different search term.'
                  : 'No farmers have registered yet.'
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table app-table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Village</th>
                      <th>District</th>
                      <th>Bookings</th>
                      <th className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {farmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td className="fw-medium">
                          {farmer.full_name}
                        </td>

                        <td>{farmer.phone}</td>

                        <td>{farmer.village}</td>

                        <td>{farmer.district}</td>

                        <td>
                          {farmer.total_bookings} total

                          {farmer.completed_bookings > 0 && (
                            <span className="text-muted small">
                              {' '}
                              ({farmer.completed_bookings}{' '}
                              completed)
                            </span>
                          )}
                        </td>

                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              openDetail(farmer)
                            }
                          >
                            View Details
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
                            loadFarmers(pageNumber)
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
        title="Farmer Details"
        isOpen={Boolean(detailFarmer)}
        onClose={() => setDetailFarmer(null)}
      >
        {detailFarmer && (
          <div>
            <dl className="row small mb-4">
              <dt className="col-4 text-muted fw-normal">
                Full Name
              </dt>

              <dd className="col-8 fw-medium">
                {detailFarmer.full_name}
              </dd>

              <dt className="col-4 text-muted fw-normal">
                Phone
              </dt>

              <dd className="col-8">
                {detailFarmer.phone}
              </dd>

              <dt className="col-4 text-muted fw-normal">
                Address
              </dt>

              <dd className="col-8">
                {detailFarmer.address}
              </dd>

              <dt className="col-4 text-muted fw-normal">
                Village
              </dt>

              <dd className="col-8">
                {detailFarmer.village}
              </dd>

              <dt className="col-4 text-muted fw-normal">
                District
              </dt>

              <dd className="col-8">
                {detailFarmer.district}
              </dd>

              <dt className="col-4 text-muted fw-normal">
                State
              </dt>

              <dd className="col-8">
                {detailFarmer.state}
              </dd>
            </dl>

            <h6 className="fw-bold text-muted text-uppercase small mb-2">
              Recent Bookings (
              {detailFarmer.total_bookings ?? 0} total)
            </h6>

            {isLoadingDetail ? (
              <Loader
                message="Loading history..."
                fullPage={false}
              />
            ) : detailFarmer.recent_bookings?.length === 0 ? (
              <p className="text-muted small">
                No bookings yet.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Centre</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detailFarmer.recent_bookings?.map(
                      (booking) => (
                        <tr key={booking.booking_id}>
                          <td>
                            #{booking.token_number}
                          </td>

                          <td>
                            {booking.centre_name}
                          </td>

                          <td>
                            {formatDate(
                              booking.booking_date,
                            )}
                          </td>

                          <td>
                            <StatusBadge
                              status={booking.status}
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FarmerDirectory;