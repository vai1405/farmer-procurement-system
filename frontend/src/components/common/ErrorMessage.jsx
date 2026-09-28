/**
 * Inline error banner with an optional retry button.
 * Used by every page that fetches data.
 */
const ErrorMessage = ({ message, onRetry }) => (
  <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
    <div>
      <strong>Something went wrong. </strong>
      {message}
    </div>

    {onRetry && (
      <button type="button" className="btn btn-sm btn-outline-danger ms-3" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

export default ErrorMessage;