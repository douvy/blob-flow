"use client";

import { useEffect, useState, useCallback } from 'react';

/**
 * Generic hook for fetching data from API with loading and error states
 * 
 * @param fetchFunction - Function that returns a promise with data
 * @param dependencies - Array of dependencies to trigger refetch
 * @param initialData - Optional initial data
 */
export function useApiData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook for paginated API data with page navigation
 * 
 * @param fetchFunction - Function that fetches paginated data
 * @param dependencies - Array of dependencies to trigger refetch
 */
export function usePaginatedApiData<T>(
  fetchFunction: (page: number, limit: number) => Promise<T>,
  dependencies: any[] = []
) {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  // Create the fetch function with current page and limit
  const fetchData = useCallback(() => {
    return fetchFunction(page, limit);
  }, [fetchFunction, page, limit]);
  
  // Use the base hook
  const { data, isLoading, error, refetch } = useApiData<T>(
    fetchData,
    [page, limit, ...dependencies]
  );
  
  // Navigation functions
  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);
  
  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);
  
  const goToPage = useCallback((pageNum: number) => {
    setPage(Math.max(1, pageNum));
  }, []);
  
  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing items per page
  }, []);
  
  return {
    data,
    isLoading,
    error,
    refetch,
    pagination: {
      page,
      limit,
      nextPage,
      prevPage,
      goToPage,
      changeLimit
    }
  };
}