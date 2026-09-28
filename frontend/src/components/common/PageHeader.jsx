/**
 * Consistent page title block with optional right-hand action area.
 *
 * Usage:
 *   <PageHeader title="My Bookings" subtitle="All your procurement slots">
 *     <button className="btn btn-agri">Book a Slot</button>
 *   </PageHeader>
 */
const PageHeader = ({ title, subtitle, children }) => (
  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
      <h1 className="h3 fw-bold mb-1">{title}</h1>
      {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
    </div>

    {children && <div className="d-flex gap-2">{children}</div>}
  </div>
);

export default PageHeader;