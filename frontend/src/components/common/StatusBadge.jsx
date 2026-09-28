import { humanizeStatus, statusVariant } from '../../utils/formatters';

/**
 * Coloured badge for any status value in the system.
 * Colour mapping lives in formatters.js so it stays consistent everywhere.
 */
const StatusBadge = ({ status, className = '' }) => {
  if (!status) {
    return <span className={`badge bg-secondary ${className}`}>—</span>;
  }

  return (
    <span className={`badge bg-${statusVariant(status)} ${className}`}>
      {humanizeStatus(status)}
    </span>
  );
};

export default StatusBadge;