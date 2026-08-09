"use client";

import { useMemo } from 'react';
import { ATTRIBUTION_ENTITY_LIMIT } from '@/constants';
import { useApiData } from './useApiData';
import { useNetwork } from './useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { api } from '../lib/api';
import type { TopUsersResponse } from '../types';

/**
 * Posting address for each attributed rollup in the selected window, keyed by
 * the rollup's display name folded to lower case.
 *
 * The attribution charts name rollups but carry no address, while the user
 * pages are addressed by address, so any surface wanting to link a rollup
 * name to its activity has to bridge the two. The users endpoint reports one
 * row per attributed entity with the address it posts from, which is exactly
 * that bridge. Read over the window on screen, so the rollups being displayed
 * are the ones the list covers.
 *
 * Callers share one cached request per network and window, so a page may look
 * a name up from as many places as it likes.
 */
export function useRollupAddresses(): ReadonlyMap<string, string> {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const { data } = useApiData<TopUsersResponse>(
    () => api.getTopUsers(ATTRIBUTION_ENTITY_LIMIT, network, timeRange),
    ['rollup-addresses', network, timeRange, ATTRIBUTION_ENTITY_LIMIT]
  );

  return useMemo(() => {
    const byName = new Map<string, string>();
    for (const user of data?.data ?? []) {
      // Unattributed rows are named after their own address, which is no
      // help in resolving a rollup name and would collide with nothing.
      if (!user.attributed) continue;
      const key = user.name.trim().toLowerCase();
      // Rows arrive busiest first, so the first address under a name is the
      // one that rollup mostly posts from.
      if (!byName.has(key)) byName.set(key, user.address);
    }
    return byName;
  }, [data]);
}
