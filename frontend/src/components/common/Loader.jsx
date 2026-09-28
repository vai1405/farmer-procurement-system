/**
 * Full-height centred spinner, used while auth state or page data loads.
 */
const Loader = ({ message = 'Loading...', fullPage = true }) => (
  <div
    className={`d-flex flex-column align-items-center justify-content-center ${
      fullPage ? 'min-vh-100' : 'py-5'
    }`}
  >
    <div className="spinner-border text-success" role="status">
      <span className="visually-hidden">Loading</span>
    </div>
    <p className="text-muted mt-3 mb-0">{message}</p>
  </div>
);

export default Loader;