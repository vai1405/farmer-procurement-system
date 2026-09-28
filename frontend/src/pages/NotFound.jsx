import { Link } from 'react-router-dom';

import { usePageTitle } from '../hooks/usePageTitle';

const NotFound = () => {
  usePageTitle('Page Not Found');

  return (
    <div className="container py-5 text-center">
      <h1 className="display-1 fw-bold text-agri">404</h1>

      <p className="lead text-muted mb-4">
        The page you are looking for does not exist.
      </p>

      <Link to="/" className="btn btn-agri">
        Go to Home
      </Link>
    </div>
  );
};

export default NotFound;