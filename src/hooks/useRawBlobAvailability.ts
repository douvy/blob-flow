"use client";

import { useQuery } from '@tanstack/react-query';
import { fetchRawBlobStatus } from '../lib/api/rawBlob';

/**
 * Whether raw blob viewing is available for a given network. Resolves to
 * false until the status request settles, so the feature only appears once
 * it is known to work. A successful answer is deployment configuration and
 * is cached for the session; failures follow react-query's retry and
 * refetch policy so a transient outage cannot pin the feature off.
 */
export function useRawBlobAvailability(networkName: string): boolean {
  const { data } = useQuery({
    queryKey: ['raw-blob-status'],
    queryFn: fetchRawBlobStatus,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return Boolean(data?.enabled && data.network === networkName.toLowerCase());
}
