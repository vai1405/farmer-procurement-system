import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME_ROUTE } from '../../utils/constants';

/**
 * The inverse of ProtectedRoute: keeps already-logged-in users away from
 * the login and register pages by sending them to their dashboard.
 */
const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <Loader message="Loading..." />;

  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME_ROUTE[role] ?? '/dashboard'} replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;