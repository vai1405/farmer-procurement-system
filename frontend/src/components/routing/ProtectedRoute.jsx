import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from '../common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME_ROUTE } from '../../utils/constants';

/**
 * Guards a group of routes.
 *
 * Behaviour:
 *   - still loading      -> show a spinner (prevents a flash of the login page)
 *   - not authenticated  -> redirect to /login, remembering where they wanted to go
 *   - wrong role         -> redirect to THEIR dashboard, not an error page
 *   - allowed            -> render the nested routes via <Outlet />
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={[ROLES.FARMER]} />}>
 *     <Route path="/dashboard" element={<FarmerDashboard />} />
 *   </Route>
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME_ROUTE[role] ?? '/login'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;