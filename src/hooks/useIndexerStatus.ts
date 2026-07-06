"use client";

import { useCallback } from 'react';
import { useApiData, UseApiDataOptions } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { StatusResponse } from '@/types';

/**
 * Indexer status for the selected network. Every consumer shares the
 * ['indexer-status', network] query cache, so the fetched shape must stay the
 * unwrapped StatusResponse — use this hook rather than querying the key
 * directly to keep subscribers consistent.
 */
export function useIndexerStatus(options?: UseApiDataOptions<StatusResponse>) {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const fetchStatus = useCallback(async () => {
    const response = await api.getStatus(network);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch indexer status');
    }
    return response.data;
  }, [network]);

  return useApiData<StatusResponse>(fetchStatus, ['indexer-status', network], options);
}
