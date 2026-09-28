import { formatTime } from '../../utils/formatters';

/**
 * Renders a slot's time range and "Available: X/Y" figure with a small
 * progress bar — the exact display format from the spec:
 *
 *   09:00 AM - 10:00 AM
 *   Available: 12/30
 */
const SlotAvailability = ({ slot, compact = false }) => {
  const filledPercent = slot.max_farmers
    ? Math.round((slot.booked_count / slot.max_farmers) * 100)
    : 0;

  const barVariant = slot.is_full
    ? 'bg-danger'
    : filledPercent >= 75
    ? 'bg-warning'
    : 'bg-success';

  return (
    <div>
      <div className={`fw-semibold ${compact ? 'small' : ''}`}>
        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
      </div>
      <div className="text-muted small mb-1">
        Available: {slot.available_count}/{slot.max_farmers}
      </div>
      <div className="progress" style={{ height: 6 }}>
        <div
          className={`progress-bar ${barVariant}`}
          role="progressbar"
          style={{ width: `${filledPercent}%` }}
          aria-valuenow={filledPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export default SlotAvailability;