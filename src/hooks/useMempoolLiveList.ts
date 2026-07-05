"use client";

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { MempoolResponse, MempoolTransaction } from '../types';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';

const MEMPOOL_REFRESH_MS = 30000;

/** Cached mempool sample plus whether the real mempool extends beyond it. */
interface MempoolLiveSnapshot extends MempoolResponse {
  truncated: boolean;
}

function renumber(transactions: MempoolTransaction[]): MempoolTransaction[] {
  return transactions.map((tx, index) => ({ ...tx, id: index + 1 }));
}

/**
 * Pending blob transactions, kept current by applying every `mempool_update`
 * event cumulatively on top of the latest REST snapshot.
 *
 * Events are written through to the React Query cache rather than held in
 * hook-local state, so a remount inside the stale window (say, navigating
 * from the homepage summary to /mempool) reseeds from the event-adjusted
 * list instead of resurrecting rows an earlier event removed. Applying an
 * event is idempotent, so several mounted instances sharing a cache entry
 * can each apply it safely. The periodic refetch repairs any drift from
 * events raced or dropped between snapshots.
 *
 * `truncated` persists across removals: once a snapshot fills the sample,
 * counts stay marked as lower bounds until a fresh snapshot says otherwise.
 * Without this, removals would shrink a full sample and make it look like an
 * exhaustive (or empty) view of a mempool that still has unsampled entries.
 */
export function useMempoolLiveList(limit: number, network?: string) {
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => ['mempool', network, limit], [network, limit]);

  const { data, isLoading, error } = useApiData<MempoolLiveSnapshot>(
    async () => {
      const response = await api.getMempool(limit, network);
      return { ...response, truncated: response.data.length >= limit };
    },
    queryKey,
    { refetchInterval: MEMPOOL_REFRESH_MS }
  );

  useLiveBlobEvent('mempool_update', (event) => {
    queryClient.setQueryData<MempoolLiveSnapshot>(queryKey, (current) => {
      if (event.data.action === 'remove') {
        // A transaction leaves the mempool atomically: drop all of its blob
        // entries. Returning `current` (or undefined) leaves the cache as is.
        if (!current) return current;
        const removedTxHash = event.data.blob.tx_hash;
        if (!current.data.some((tx) => tx.txHash === removedTxHash)) return current;
        return {
          ...current,
          data: current.data.filter((tx) => tx.txHash !== removedTxHash),
        };
      }

      // The feed is one entry per blob: adds replace only the matching
      // (txHash, blobIndex) entry so a multi-blob transaction accumulates
      // one row per blob, matching the REST snapshot.
      const liveTransaction = transformBlobToMempoolTransaction(event.data.blob, 0);
      const merged = [
        liveTransaction,
        ...(current?.data ?? []).filter(
          (tx) =>
            tx.txHash !== liveTransaction.txHash ||
            tx.rawBlob.blob_index !== liveTransaction.rawBlob.blob_index
        ),
      ];
      return {
        data: merged.slice(0, limit),
        truncated: (current?.truncated ?? false) || merged.length > limit,
      };
    });
  });

  const transactions = React.useMemo(
    () => (data ? renumber(data.data.slice(0, limit)) : null),
    [data, limit]
  );

  return { transactions, truncated: data?.truncated ?? false, isLoading, error };
}
