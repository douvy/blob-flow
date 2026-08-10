"use client";

import { useState } from 'react';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { transformUserResponses } from '../lib/api/users';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { BackendUsersRange, TopUsersResponse } from '../types';

interface LiveSnapshot {
  data: TopUsersResponse;
  receivedAt: number;
}

/**
 * Top blob users scoped to a time window, entity-grouped: an entity posting
 * from several addresses is one row ranked by its combined total, with the
 * busiest member as the row's address. Kept current by users_update live
 * events. Subscribers passing the same limit/network/range share one React
 * Query cache entry, so every surface reading a window (the Top Blob Users
 * table, the Top User metric card, the kiosk rollup bars) shows the same
 * rows.
 *
 * Live events carry the window they aggregate over; one scoped to a
 * different window or network must never overwrite this view. Snapshots are
 * kept per scope and consulted only for the matching scope, so returning to
 * a window resumes from its latest snapshot instead of rolling back to an
 * older cached fetch.
 */
export function useTopUsers(limit: number, network: string, range: BackendUsersRange) {
  const { data, isLoading, error, dataUpdatedAt } = useApiData<TopUsersResponse>(
    () => api.getTopUsers(limit, network, range, 'entity'),
    ['top-users', network, limit, range, 'entity']
  );

  const scopeKey = `${network}:${range}`;
  const [liveSnapshots, setLiveSnapshots] = useState<ReadonlyMap<string, LiveSnapshot>>(
    new Map()
  );
  useLiveBlobEvent('users_update', (event) => {
    // The backend broadcasts a per-address and an entity-grouped variant of
    // every update; this hook shows entity rows, so only the grouped payload
    // may overwrite the view (folding both would alternate the table).
    if (event.range === range && event.group === 'entity') {
      setLiveSnapshots((current) => {
        const next = new Map(current);
        next.set(scopeKey, {
          data: transformUserResponses(event.data),
          receivedAt: Date.now(),
        });
        return next;
      });
    }
  });

  // A snapshot overlays the REST entry only while it is newer than the last
  // fetch. Once a refetch lands (reconnect invalidation, remount after
  // staleness), the REST rows win, so a quiet websocket can never pin stale
  // rows on screen.
  const snapshot = liveSnapshots.get(scopeKey);
  const showLive = Boolean(snapshot && snapshot.receivedAt > (dataUpdatedAt ?? 0));
  const displayData = showLive && snapshot ? snapshot.data : data;

  return {
    data: displayData,
    isLoading,
    // A displayed snapshot is fresher than the failed fetch it outlived;
    // reporting that error against it would mislabel current rows as stale.
    error: showLive ? null : error,
    scopeKey,
  };
}
