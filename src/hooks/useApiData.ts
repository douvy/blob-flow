"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';

export interface UseApiDataOptions<T> {
  enabled?: boolean;
  initialData?: T;
  refetchInterval?: number;
  staleTime?: number;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown error occurred');
}

/**
 * Generic hook for fetching data from API with loading and error states.
 *
 * @param fetchFunction - Function that returns a promise with data
 * @param queryKey - React Query cache key. Subscribers sharing the same key share cache and dedupe requests.
 * @param options - Optional React Query passthrough (enabled, initialData, refetchInterval, staleTime)
 */
export function useApiData<T>(
  fetchFunction: () => Promise<T>,
  queryKey: QueryKey,
  options: UseApiDataOptions<T> = {}
) {
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

  // React Query v5 merges these options over the QueryClient defaults with a
  // plain spread, so an explicit `undefined` clobbers any app-wide default
  // (e.g. AppProviders sets staleTime: 15_000). Only forward each option when
  // the caller actually supplied it, matching the refetchOnWindowFocus fix.
  const query = useQuery<T, Error>({
    queryKey,
    queryFn,
    ...(options.enabled !== undefined && { enabled: options.enabled }),
    ...(options.initialData !== undefined && {
      initialData: options.initialData,
      initialDataUpdatedAt: 0,
    }),
    ...(options.refetchInterval !== undefined && {
      refetchInterval: options.refetchInterval,
    }),
    ...(options.staleTime !== undefined && { staleTime: options.staleTime }),
  });

  const queryRefetch = query.refetch;
  const refetch = useCallback(async () => {
    const result = await queryRefetch();
    return result.data;
  }, [queryRefetch]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch,
  };
}
