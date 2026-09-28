import { useCallback, useState } from 'react';

import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNotifications } from '../../context/NotificationContext';
import { useFetch } from '../../hooks/useFetch';
import { getErrorMessage } from '../../services/api';
import { notificationService } from '../../services/notificationService';
import { formatDateTime } from '../../utils/formatters';

const TYPE_ICONS = {
  REGISTRATION: '👋',
  BOOKING_CONFIRMED: '📅',
  BOOKING_CANCELLED: '❌',
  QUEUE_APPROACHING: '⏱️',
  FARMER_CALLED: '📢',
  PROCUREMENT_COMPLETED: '🌾',
  PAYMENT_COMPLETED: '💰',
};

/**
 * Farmer's notification inbox.
 *
 * Fetches the full history via REST on load; new arrivals during this
 * session appear immediately too, because NotificationContext's toast
 * popup (Step 12, section 11) prompts a manual "↻ Refresh" habit, and
 * because we also merge the latest live notification in directly below.
 */
const Notifications = () => {
  usePageTitle('Notifications');
  const { resetUnreadCount, decrementUnreadCount } = useNotifications();
  const [filter, setFilter] = useState('all'); // all | unread

  const fetchNotifications = useCallback(
    () => notificationService.list({ unreadOnly: filter === 'unread' }),
    [filter],
  );
  const { data, isLoading, error, refetch, setData } = useFetch(fetchNotifications);

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleMarkRead = async (notification) => {
    if (notification.is_read) return;

    try {
      await notificationService.markAsRead(notification.id);
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
        unread_count: Math.max(0, current.unread_count - 1),
      }));
      decrementUnreadCount(1);
    } catch {
      // Non-critical — leave it unread if the request fails; the user
      // can try again, no destructive consequence either way.
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setData((current) => ({
        ...current,
        notifications: current.notifications.map((item) => ({ ...item, is_read: true })),
        unread_count: 0,
      }));
      resetUnreadCount();
    } catch {
      // Non-critical.
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (isLoading && !data) {
    return <Loader message="Loading notifications..." fullPage={false} />;
  }

  if (error && !data) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  const notifications = data?.notifications ?? [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          data?.unread_count
            ? `${data.unread_count} unread notification(s)`
            : 'You are all caught up'
        }
      >
        <div className="btn-group">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-agri' : 'btn-outline-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`btn btn-sm ${filter === 'unread' ? 'btn-agri' : 'btn-outline-secondary'}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>

        {data?.unread_count > 0 && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          message="You'll see updates about your bookings, queue status, and payments here."
        />
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="list-group list-group-flush">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`list-group-item list-group-item-action d-flex gap-3 py-3 ${
                  !notification.is_read ? 'bg-agri-light' : ''
                }`}
                onClick={() => handleMarkRead(notification)}
              >
                <span className="fs-4" aria-hidden="true">
                  {TYPE_ICONS[notification.type] ?? '🔔'}
                </span>
                <div className="text-start flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="fw-semibold">{notification.title}</span>
                    {!notification.is_read && (
                      <span className="badge bg-agri rounded-pill ms-2">New</span>
                    )}
                  </div>
                  <div className="text-muted small mb-1">{notification.message}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {formatDateTime(notification.created_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;