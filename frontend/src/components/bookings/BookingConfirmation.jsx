import { Link } from 'react-router-dom';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatDate, formatTime, formatToken } from '../../utils/formatters';

/**
 * Booking confirmation dialog, shown immediately after a successful
 * booking. Matches the spec's format exactly:
 *
 *   Booking confirmed!
 *   Centre: Main Procurement Centre
 *   Date: 25 September 2026
 *   Time: 10:00 AM - 11:00 AM
 *   Token: #42
 *   Status: WAITING
 */
const BookingConfirmation = ({ booking, isOpen, onClose }) => {
  if (!booking) return null;

  return (
    <Modal title="" isOpen={isOpen} onClose={onClose} size="modal-sm">
      <div className="text-center">
        <div className="display-4 mb-2" aria-hidden="true">✅</div>
        <h4 className="fw-bold text-agri mb-1">Booking Confirmed!</h4>
        <p className="text-muted mb-4">
          Please save your token number — you'll need it at the centre.
        </p>

        <div className="bg-agri-light rounded-3 p-4 mb-4">
          <div className="text-muted small text-uppercase fw-semibold mb-1">
            Your Token
          </div>
          <div className="token-display mb-2">{formatToken(booking.token_number)}</div>
          <StatusBadge status={booking.status} />
        </div>

        <dl className="row text-start mb-0 small">
          <dt className="col-5 text-muted fw-normal">Centre</dt>
          <dd className="col-7 fw-medium">{booking.centre?.name}</dd>

          <dt className="col-5 text-muted fw-normal">Location</dt>
          <dd className="col-7">{booking.centre?.location}</dd>

          <dt className="col-5 text-muted fw-normal">Date</dt>
          <dd className="col-7 fw-medium">{formatDate(booking.slot?.date)}</dd>

          <dt className="col-5 text-muted fw-normal">Time</dt>
          <dd className="col-7">
            {formatTime(booking.slot?.start_time)} – {formatTime(booking.slot?.end_time)}
          </dd>

          <dt className="col-5 text-muted fw-normal">Queue Position</dt>
          <dd className="col-7">{booking.queue_position}</dd>
        </dl>

        <div className="d-flex gap-2 mt-4">
          <Link to="/my-bookings" className="btn btn-outline-secondary flex-fill" onClick={onClose}>
            View My Bookings
          </Link>
          <Link to="/dashboard" className="btn btn-agri flex-fill" onClick={onClose}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </Modal>
  );
};

export default BookingConfirmation;