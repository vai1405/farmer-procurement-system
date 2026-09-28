import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay`
 * milliseconds have passed without further changes.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(query, 400);
 *   useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
export const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};