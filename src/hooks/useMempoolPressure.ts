"use client";

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { MEMPOOL_REFRESH_MS } from '../constants';
import { MempoolPressure } from '../types';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';

/**
 * A block landing (or a burst of new transactions) emits one mempool_update
 * per blob; collapse each burst into a single pressure refetch.
 */
export const MEMPOOL_PRESSURE_EVENT_DEBOUNCE_MS = 1000;

/**
 * Shared mempool pressure snapshot: pending blob count, includability, fee
 * distribution.
 *
 * Every consumer reads the same query key, so the homepage hero's Pending
 * stat, the Live Metrics Pending Blobs card, and the /mempool stat cards all
 * render one cached snapshot and update together from a single fetch instead
 * of drifting apart on independent polling cycles.
 *
 * mempool_update events invalidate the snapshot (debounced), so the counts
 * follow the same live transaction feed that MempoolSummary and MempoolTable
 * apply those events to; the interval poll repairs any drift while the
 * socket is quiet or down.
 */
export function useMempoolPressure(network?: string) {
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => ['mempool-pressure', network], [network]);

  const fetchPressure = React.useCallback(
    () => api.getMempoolPressure(network),
    [network]
  );

  const result = useApiData<MempoolPressure>(fetchPressure, queryKey, {
    refetchInterval: MEMPOOL_REFRESH_MS,
  });

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useLiveBlobEvent('mempool_update', () => {
    if (debounceRef.current !== null) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      // Several mounted consumers each hold their own debounce timer, so one
      // event burst can invalidate more than once in the same tick. Without
      // cancelRefetch: false, the second invalidation would cancel and restart
      // the in-flight refetch; our queryFn ignores the abort signal, so that
      // means two live requests instead of one shared one.
      void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false });
    }, MEMPOOL_PRESSURE_EVENT_DEBOUNCE_MS);
  });

  React.useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  return result;
}
