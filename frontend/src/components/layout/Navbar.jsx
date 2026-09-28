import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';

/**
 * Top navigation bar.
 *
 * The notification bell is now live (Step 12): it shows the real unread
 * count from NotificationContext and links to the Notifications page.
 */
const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const toast = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.info('You have been logged out.');
    navigate('/login', { replace: true });
  };

  const notificationsPath = role === 'FARMER' ? '/notifications' : null;

  return (
    <header className="app-navbar">
      <button
        type="button"
        className="btn btn-link text-dark d-lg-none p-0 me-2"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation"
      >
        <span className="fs-3">☰</span>
      </button>

      <div className="fw-semibold d-none d-sm-block">
        Smart Farmer Procurement &amp; Queue Management
      </div>
      <div className="fw-semibold d-sm-none">Procurement</div>

      <div className="ms-auto d-flex align-items-center gap-3">
        <button
          type="button"
          className="btn btn-link text-dark position-relative p-0"
          aria-label="Notifications"
          onClick={() => notificationsPath && navigate(notificationsPath)}
          disabled={!notificationsPath}
          title={notificationsPath ? 'Notifications' : 'Notifications (farmer only)'}
        >
          <span className="fs-5">🔔</span>
          {unreadCount > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {unreadCount > 9 ? '9+' : unreadCount}
              <span className="visually-hidden">unread notifications</span>
            </span>
          )}
        </button>

        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light d-flex align-items-center gap-2"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="navbar-avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
            <span className="d-none d-md-inline text-truncate" style={{ maxWidth: 140 }}>
              {user?.full_name}
            </span>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="position-fixed top-0 start-0 w-100 h-100"
                style={{ zIndex: 1 }}
                onClick={() => setIsMenuOpen(false)}
                role="presentation"
              />
              <div
                className="dropdown-menu show shadow border-0 mt-2"
                style={{ right: 0, left: 'auto', zIndex: 2 }}
              >
                <div className="px-3 py-2 border-bottom">
                  <div className="fw-semibold">{user?.full_name}</div>
                  <div className="small text-muted">{user?.email}</div>
                  <span className="badge bg-agri mt-1">{role}</span>
                </div>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;