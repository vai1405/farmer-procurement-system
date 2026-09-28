import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

/**
 * Shell for every authenticated page: sidebar + navbar + content area.
 *
 * Used as a layout route so nested pages render through <Outlet />:
 *   <Route element={<DashboardLayout />}>
 *     <Route path="/dashboard" element={<FarmerDashboard />} />
 *   </Route>
 *
 * The sidebar is permanently visible on large screens and becomes a
 * slide-in drawer below the lg breakpoint.
 */
const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="visually-hidden-focusable skip-link"
      >
        Skip to main content
      </a>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="app-main">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        />

        <main
          id="main-content"
          className="app-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;