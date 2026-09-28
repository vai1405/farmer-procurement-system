import { useAuth } from '../hooks/useAuth';

/**
 * Temporary dashboard used in Step 3 to verify that protected routes and
 * role-based access work. Replaced by the real dashboards in Steps 4/13/14.
 */
const PlaceholderDashboard = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <div className="container py-5">
      <div className="card auth-card p-4 p-md-5">
        <h2 className="h3 fw-bold text-agri">{title}</h2>
        <p className="text-muted">
          You are signed in as <strong>{user?.full_name}</strong> with the role{' '}
          <span className="badge bg-agri">{user?.role}</span>
        </p>

        <div className="bg-agri-light rounded p-3 my-3">
          <div className="small text-muted">Email</div>
          <div className="fw-medium">{user?.email}</div>
          <div className="small text-muted mt-2">Phone</div>
          <div className="fw-medium">{user?.phone}</div>
        </div>

        <button className="btn btn-outline-danger align-self-start" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
};

export default PlaceholderDashboard;