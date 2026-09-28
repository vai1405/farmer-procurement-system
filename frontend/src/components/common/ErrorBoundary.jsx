import { Component } from 'react';

/**
 * Catches JavaScript errors anywhere in the child component tree and
 * shows a recovery screen instead of a blank white page.
 *
 * This is the ONE place in the project that must be a class component —
 * React does not support error boundaries via hooks. Everything else in
 * the app remains function components.
 *
 * Placed once at the top of the app (main.jsx), so any unexpected
 * rendering error anywhere is caught here rather than crashing the
 * whole page silently.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a real deployment this would report to a logging service.
    // For the project demo, logging to console is sufficient and
    // visible during a live walkthrough if needed.
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 p-4">
          <div className="text-center" style={{ maxWidth: 420 }}>
            <div className="display-1 mb-3" aria-hidden="true">⚠️</div>
            <h2 className="fw-bold mb-2">Something went wrong</h2>
            <p className="text-muted mb-4">
              An unexpected error occurred. This has been logged. Try
              reloading the page — if the problem continues, please contact
              support.
            </p>
            <button type="button" className="btn btn-agri" onClick={this.handleReload}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;