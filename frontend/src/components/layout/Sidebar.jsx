import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';

/**
 * Role-aware sidebar navigation.
 *
 * The link set is derived from the user's role, so a farmer never even
 * sees staff routes. This is a convenience, not a security control —
 * the real enforcement is ProtectedRoute plus the backend permissions.
 *
 * Items marked `pending` are built in later steps. They are rendered
 * disabled so the full navigation structure is visible from the start.
 */
const NAV_ITEMS = {
  [ROLES.FARMER]: [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/book-slot', label: 'Book Slot', icon: '📅' },
    { to: '/my-bookings', label: 'My Bookings', icon: '📋' },
    { to: '/queue', label: 'Live Queue', icon: '⏱️', pending: true },
    { to: '/procurement', label: 'Procurement', icon: '🌾', pending: true },
    { to: '/payment', label: 'Payments', icon: '💰' },
    { to: '/notifications', label: 'Notifications', icon: '🔔' },
    { to: '/profile', label: 'My Profile', icon: '👤' },
  ],

  [ROLES.STAFF]: [
    { to: '/staff/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/staff/queue', label: 'Queue Control', icon: '⏱️' },
    { to: '/staff/farmers', label: 'Farmers', icon: '👥' },
    { to: '/staff/centres', label: 'Centres', icon: '🏢' },
    { to: '/staff/slots', label: 'Slots', icon: '📅' },
    { to: '/staff/procurement', label: 'Procurement', icon: '🌾' },
    { to: '/staff/payments', label: 'Payments', icon: '💰' },
  ],

 [ROLES.ADMIN]: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/staff/queue', label: 'Queue Control', icon: '⏱️' },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/staff', label: 'Staff', icon: '🧑‍💼' },
    { to: '/admin/centres', label: 'Centres', icon: '🏢' },
    { to: '/admin/reports', label: 'Reports', icon: '📊' },
  ],
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, role } = useAuth();
  const items = NAV_ITEMS[role] ?? [];

  return (
    <>
      {/* Backdrop shown only on mobile when the drawer is open */}
      {isOpen && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="fs-4" aria-hidden="true">
            🌾
          </span>

          <div className="lh-sm">
            <div className="fw-bold">Procurement</div>
            <div className="small opacity-75">
              Management System
            </div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>

          <div className="min-w-0">
            <div className="fw-semibold text-truncate">
              {user?.full_name}
            </div>

            <div className="small opacity-75">
              {role}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) =>
            item.pending ? (
              <span
                key={item.to}
                className="sidebar-link is-pending"
                title="Coming in a later step"
              >
                <span
                  className="sidebar-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span className="flex-grow-1">
                  {item.label}
                </span>

                <span className="badge bg-light text-dark small">
                  soon
                </span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'is-active' : ''}`
                }
              >
                <span
                  className="sidebar-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;