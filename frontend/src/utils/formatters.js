/**
 * Shared display formatters.
 * Keeping these in one file guarantees dates and currency look identical
 * on every page.
 */

/** Format a number as Indian rupees, e.g. 12480 -> "₹12,480.00" */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value));
};

/** Format an ISO date string as "25 September 2026" */
export const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** Format an ISO string as "25 Sep 2026, 10:30 am" */
export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Convert "14:30" (24h) to "02:30 PM" */
export const formatTime = (timeString) => {
  if (!timeString) return '—';
  const [hourPart, minutePart] = String(timeString).split(':');
  const hour = Number(hourPart);
  if (Number.isNaN(hour)) return timeString;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:${minutePart} ${period}`;
};

/** Turn minutes into a readable duration: 95 -> "1 hr 35 min" */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '—';
  const total = Number(minutes);
  if (Number.isNaN(total)) return '—';
  if (total <= 0) return 'Your turn now';
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};

/** Display a token number as "#42" */
export const formatToken = (token) =>
  token === null || token === undefined ? '—' : `#${token}`;

/** Map a status string to a Bootstrap badge colour. */
export const statusVariant = (status) => {
  const map = {
    BOOKED: 'primary',
    WAITING: 'warning',
    CALLED: 'info',
    PROCESSING: 'info',
    COMPLETED: 'success',
    CANCELLED: 'secondary',
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    REJECTED: 'danger',
    PAID: 'success',
    FAILED: 'danger',
    ACTIVE: 'success',
    INACTIVE: 'secondary',
    FULL: 'danger',
  };
  return map[status] ?? 'secondary';
};

/** Convert "IN_PROGRESS" to "In Progress" for display. */
export const humanizeStatus = (status) => {
  if (!status) return '—';
  return String(status)
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};