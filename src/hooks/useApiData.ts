"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';

interface UseApiDataOptions {
  enabled?: boolean;
  queryKey?: QueryKey;
  refetchInterval?: number;
  staleTime?: number;
}

let queryInstanceId = 0;

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown error occurred');
}

/**
 * Generic hook for fetching data from API with loading and error states
 *
 * @param fetchFunction - Function that returns a promise with data
 * @param initialData - Optional initial data
 * @param refetchKey - Optional key that triggers automatic refetch when changed
 */
export function useApiData<T>(
  fetchFunction: () => Promise<T>,
  initialData?: T,
  refetchKey?: unknown,
  options: UseApiDataOptions = {}
) {
  const [instanceKey] = useState(() => {
    queryInstanceId += 1;
    return `api-data-${queryInstanceId}`;
  });
  const fetchFunctionRef = useRef(fetchFunction);

  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  const queryFn = useCallback(async () => {
    try {
      return await fetchFunctionRef.current();
    } catch (err) {
      throw normalizeError(err);
    }
  }, []);

  const query = useQuery<T, Error>({
    queryKey: options.queryKey ?? ['api-data', instanceKey, refetchKey],
    queryFn,
    enabled: options.enabled,
    initialData,
    refetchInterval: options.refetchInterval,
    staleTime: options.staleTime,
  });

  const refetch = useCallback(async () => {
    const result = await query.refetch();
    return result.data;
  }, [query]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}

/**
 * Hook for paginated API data with page navigation
 *
 * @param fetchFunction - Function that fetches paginated data
 * @param network - Optional network parameter
 */
export function usePaginatedApiData<T>(
  fetchFunction: (page: number, limit: number, network?: string) => Promise<T>,
  network?: string
) {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Create the fetch function with current page and limit
  const fetchData = useCallback(() => {
    return fetchFunction(page, limit, network);
  }, [fetchFunction, page, limit, network]);

  // Use the base hook
  const { data, isLoading, error, refetch } = useApiData<T>(
    fetchData,
    undefined,
    `${network || ''}:${page}:${limit}`
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
