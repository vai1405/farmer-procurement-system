import { formatToken } from '../../utils/formatters';

/**
 * A single token badge in the waiting/serving lists, e.g. "#38".
 *
 * variant "serving" optionally shows a "Record Procurement" action via
 * onRecordProcurement, so staff can move straight from calling a farmer
 * to recording their crop details without leaving Queue Control.
 */
const TokenPill = ({ booking, variant = 'waiting', onRecordProcurement, hasProcurement }) => (
  <div className={`token-pill token-pill-${variant}`}>
    <span className="token-pill-number">{formatToken(booking.token_number)}</span>
    <span className="token-pill-name">{booking.farmer_name}</span>

    {variant === 'serving' && onRecordProcurement && (
      <button
        type="button"
        className={`btn btn-sm ms-2 ${hasProcurement ? 'btn-outline-secondary' : 'btn-agri'}`}
        onClick={() => onRecordProcurement(booking)}
        disabled={hasProcurement}
      >
        {hasProcurement ? 'Recorded ✓' : 'Record Procurement'}
      </button>
    )}
  </div>
);

export default TokenPill;