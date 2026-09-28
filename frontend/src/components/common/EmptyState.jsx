import { Link } from 'react-router-dom';

/**
 * Shown when a list or section has no data yet.
 * Always gives the user a next action rather than a dead end.
 */
const EmptyState = ({
  icon = '📭',
  title = 'Nothing here yet',
  message = '',
  actionLabel,
  actionTo,
  onAction,
}) => (
  <div className="text-center py-5">
    <div className="display-4 mb-3" aria-hidden="true">
      {icon}
    </div>
    <h5 className="fw-semibold">{title}</h5>
    {message && <p className="text-muted mb-4">{message}</p>}

    {actionLabel && actionTo && (
      <Link to={actionTo} className="btn btn-agri">
        {actionLabel}
      </Link>
    )}
    {actionLabel && onAction && !actionTo && (
      <button type="button" className="btn btn-agri" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;