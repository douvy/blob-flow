"use client";

import React from 'react';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { MempoolResponse, MempoolTransaction } from '../types';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';

function renumber(transactions: MempoolTransaction[]): MempoolTransaction[] {
  return transactions.map((tx, index) => ({ ...tx, id: index + 1 }));
}

/**
 * Pending blob transactions, kept current by applying every `mempool_update`
 * event cumulatively on top of the latest REST snapshot.
 *
 * Events must accumulate: deriving the list from the snapshot plus only the
 * most recent event resurrects rows an earlier event removed. A fresh
 * snapshot (initial load, network switch, reconnect refetch) resets the
 * working list; live events then mutate it in place.
 */
export function useMempoolLiveList(limit: number, network?: string) {
  const { data, isLoading, error } = useApiData<MempoolResponse>(
    () => api.getMempool(limit, network),
    ['mempool', network, limit]
  );

  const [transactions, setTransactions] = React.useState<MempoolTransaction[] | null>(null);
  const [seededSnapshot, setSeededSnapshot] = React.useState<MempoolResponse | undefined>(undefined);

  // Reseed the working list whenever a fresh snapshot arrives, adjusted
  // during render (not in an effect) so the reset commits in the same pass:
  // https://react.dev/learn/you-might-not-need-an-effect
  if (data !== seededSnapshot) {
    setSeededSnapshot(data);
    setTransactions(data ? renumber(data.data.slice(0, limit)) : null);
  }

  useLiveBlobEvent('mempool_update', (event) => {
    setTransactions((current) => {
      const list = current ?? [];

      if (event.data.action === 'remove') {
        const removedTxHash = event.data.blob.tx_hash;
        if (!list.some((tx) => tx.txHash === removedTxHash)) return current;
        return renumber(list.filter((tx) => tx.txHash !== removedTxHash));
      }

      // The feed is one entry per blob: adds replace only the matching
      // (txHash, blobIndex) entry so a multi-blob transaction accumulates one
      // row per blob, matching the REST snapshot; removes drop the whole
      // transaction since it leaves the mempool atomically.
      const liveTransaction = transformBlobToMempoolTransaction(event.data.blob, 0);
      const liveBlobIndex = liveTransaction.rawBlob.blob_index;
      return renumber(
        [
          liveTransaction,
          ...list.filter(
            (tx) =>
              tx.txHash !== liveTransaction.txHash ||
              tx.rawBlob.blob_index !== liveBlobIndex
          ),
        ].slice(0, limit)
      );
    });
  });

  return { transactions, isLoading, error };
}
