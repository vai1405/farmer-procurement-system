import { useEffect } from 'react';

const APP_NAME = 'Smart Farmer Procurement System';

/**
 * Sets the browser tab title for the current page.
 *
 * Usage:
 *   usePageTitle('Dashboard');  // -> "Dashboard | Smart Farmer Procurement System"
 *
 * Restores the previous title on unmount, so navigating away (or a
 * modal-driven title change elsewhere) doesn't leave a stale title.
 */
export const usePageTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};