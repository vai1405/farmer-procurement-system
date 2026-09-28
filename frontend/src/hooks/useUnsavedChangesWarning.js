import { useEffect } from 'react';

/**
 * Warns the user with the browser's native confirmation dialog before
 * they close the tab or navigate away via browser controls, if
 * `hasUnsavedChanges` is true.
 *
 * Note: this only catches browser-level navigation (tab close, refresh,
 * back button) — in-app React Router navigation (clicking a sidebar
 * link) is not interrupted by this hook, since that would need a data
 * router setup beyond this project's scope. For a college project demo,
 * the browser-level guard is the meaningful protection: it's the case
 * where real work is actually at risk of being lost.
 *
 * Usage:
 *   useUnsavedChangesWarning(form.crop_name !== '' && !justSubmitted);
 */
export const useUnsavedChangesWarning = (hasUnsavedChanges) => {
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Modern browsers ignore custom messages and show their own,
      // but setting returnValue is still required to trigger the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
};