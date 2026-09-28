/**
 * Dashboard metric card.
 *
 * Props:
 *   icon     - emoji or icon string shown in the tinted circle
 *   label    - small caption above the value
 *   value    - the main figure (string or number)
 *   subtext  - optional smaller line beneath the value
 *   variant  - Bootstrap colour name used for the accent
 *   isLoading- renders a placeholder shimmer instead of the value
 */
const StatCard = ({
  icon,
  label,
  value,
  subtext,
  variant = 'success',
  isLoading = false,
}) => (
  <div className="card border-0 shadow-sm h-100 stat-card">
    <div className="card-body d-flex align-items-start gap-3">
      <div className={`stat-icon bg-${variant} bg-opacity-10 text-${variant}`}>
        <span aria-hidden="true">{icon}</span>
      </div>

      <div className="flex-grow-1 min-w-0">
        <div className="text-muted small text-uppercase fw-semibold">{label}</div>

        {isLoading ? (
          <div className="placeholder-glow mt-1">
            <span className="placeholder col-6" />
          </div>
        ) : (
          <div className="stat-value text-truncate">{value}</div>
        )}

        {subtext && !isLoading && (
          <div className="text-muted small mt-1">{subtext}</div>
        )}
      </div>
    </div>
  </div>
);

export default StatCard;