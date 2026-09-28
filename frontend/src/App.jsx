import { Navigate, Route, Routes } from 'react-router-dom';

import DashboardLayout from './components/layout/DashboardLayout';
import OfflineBanner from './components/common/OfflineBanner';
import ProtectedRoute from './components/routing/ProtectedRoute';
import PublicOnlyRoute from './components/routing/PublicOnlyRoute';
import ScrollToTop from './components/routing/ScrollToTop';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import BookSlot from './pages/farmer/BookSlot';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import MyBookings from './pages/farmer/MyBookings';
import Payments from './pages/farmer/Payments';
import Notifications from './pages/farmer/Notifications';
import Profile from './pages/farmer/Profile';

import CentreManagement from './pages/staff/CentreManagement';
import SlotManagement from './pages/staff/SlotManagement';
import QueueControl from './pages/staff/QueueControl';
import ProcurementManagement from './pages/staff/ProcurementManagement';
import PaymentManagement from './pages/staff/PaymentManagement';
import FarmerDirectory from './pages/staff/FarmerDirectory';
import StaffDashboard from './pages/staff/StaffDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import Reports from './pages/admin/Reports';
import StaffAccounts from './pages/admin/StaffAccounts';
import UserManagement from './pages/admin/UserManagement';

import NotFound from './pages/NotFound';

import { ROLES } from './utils/constants';

function App() {
  return (
    <>
      <OfflineBanner />
      <ScrollToTop />

      <Routes>
        {/* ---------------- Public Routes ---------------- */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ---------------- Farmer ---------------- */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.FARMER]} />}>
          <Route element={<DashboardLayout />}>

            <Route
              path="/dashboard"
              element={<FarmerDashboard />}
            />

            <Route
              path="/book-slot"
              element={<BookSlot />}
            />

            <Route
              path="/my-bookings"
              element={<MyBookings />}
            />

            {/* Step 11: Farmer Payments */}
            <Route
              path="/payment"
              element={<Payments />}
            />

            {/* Step 14: Farmer Notifications */}
            <Route
              path="/notifications"
              element={<Notifications />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

          </Route>
        </Route>

        {/* ---------------- Staff & Admin ---------------- */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}
            />
          }
        >
          <Route element={<DashboardLayout />}>

            {/* Staff Dashboard */}
            <Route
              path="/staff/dashboard"
              element={<StaffDashboard />}
            />

            <Route
              path="/staff/centres"
              element={<CentreManagement />}
            />

            <Route
              path="/staff/slots"
              element={<SlotManagement />}
            />

            <Route
              path="/staff/queue"
              element={<QueueControl />}
            />

            {/* Step 10: Procurement Management */}
            <Route
              path="/staff/procurement"
              element={<ProcurementManagement />}
            />

            {/* Step 11: Payment Management */}
            <Route
              path="/staff/payments"
              element={<PaymentManagement />}
            />

            {/* Farmer Directory */}
            <Route
              path="/staff/farmers"
              element={<FarmerDirectory />}
            />

          </Route>
        </Route>

        {/* ---------------- Admin Only ---------------- */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMIN]}
            />
          }
        >
          <Route element={<DashboardLayout />}>

            {/* Admin Dashboard */}
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            {/* User Management */}
            <Route
              path="/admin/users"
              element={<UserManagement />}
            />

            {/* Staff Accounts */}
            <Route
              path="/admin/staff"
              element={<StaffAccounts />}
            />

            {/* Centre Management */}
            <Route
              path="/admin/centres"
              element={<CentreManagement />}
            />

            {/* Reports */}
            <Route
              path="/admin/reports"
              element={<Reports />}
            />

          </Route>
        </Route>

        {/* ---------------- Default / 404 ---------------- */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </>
  );
}

export default App;