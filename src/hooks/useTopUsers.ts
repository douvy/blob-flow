"use client";

import { useState } from 'react';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { transformUserResponses } from '../lib/api/users';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { BackendUsersRange, TopUsersResponse } from '../types';

/**
 * Top blob users scoped to a time window, kept current by users_update live
 * events. Subscribers passing the same limit/network/range share one React
 * Query cache entry, so every surface reading a window (the Top Blob Users
 * table, the Top User metric card) shows the same rows.
 *
 * Live events carry the window they aggregate over; one scoped to a
 * different window or network must never overwrite this view. Snapshots are
 * stored with their scope and consulted only while it matches, so a scope
 * switch falls back to the REST data on that same render (an effect-based
 * reset alone would paint one frame of the old window's rows first).
 */
export function useTopUsers(limit: number, network: string, range: BackendUsersRange) {
  const { data, isLoading, error } = useApiData<TopUsersResponse>(
    () => api.getTopUsers(limit, network, range),
    ['top-users', network, limit, range]
  );

  const scopeKey = `${network}:${range}`;
  const [liveUpdate, setLiveUpdate] = useState<{
    scopeKey: string;
    data: TopUsersResponse;
  } | null>(null);
  useLiveBlobEvent('users_update', (event) => {
    if (event.range === range) {
      setLiveUpdate({ scopeKey, data: transformUserResponses(event.data) });
    }
  });
  // Drop snapshots from a previous scope in the render that switches away
  // (the documented adjust-state-on-prop-change pattern), so returning to a
  // scope later starts from fresh REST data instead of the stale snapshot.
  if (liveUpdate && liveUpdate.scopeKey !== scopeKey) {
    setLiveUpdate(null);
  }

  const displayData = (liveUpdate?.scopeKey === scopeKey ? liveUpdate.data : null) ?? data;

  return { data: displayData, isLoading, error, scopeKey };
}
