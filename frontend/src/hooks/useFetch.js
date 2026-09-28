import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api';

/**
 * Generic data-fetching hook handling the three states every page needs:
 * loading, error, and data — plus a refetch function.
 *
 * Usage:
 *   const { data, isLoading, error, refetch } =
 *     useFetch(farmerService.getDashboard);
 *
 * `fetcher` must be a stable reference (defined outside the component or
 * wrapped in useCallback) to avoid an infinite fetch loop.
 */
export const useFetch = (fetcher, { immediate = true } = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState('');

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { data, isLoading, error, refetch: execute, setData };
};