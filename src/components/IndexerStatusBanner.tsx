"use client";

import React, { useCallback } from 'react';
import { DatabaseBackup, TriangleAlert } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { useNow } from '../hooks/useNow';
import { api } from '../lib/api';
import { StatusResponse } from '../types';
import {
  INDEXER_LAG_THRESHOLD_SECONDS,
  INDEXER_STATUS_POLL_MS,
  SECONDS_PER_BLOCK,
} from '../constants';
import { formatDuration, formatNumber, formatPercent } from '../utils';

/**
 * Seconds the indexer trails the chain head. Uses the larger of the
 * backend-reported block lag and the age of the last indexed block, so a
 * stalled indexer is caught even if its own head tracking is stuck.
 */
export function computeLagSeconds(status: StatusResponse, nowMs: number): number {
  const blockLagSeconds = (status.indexer_lag_blocks ?? 0) * SECONDS_PER_BLOCK;

  const lastIndexedMs = Date.parse(status.last_indexed_time);
  const timeLagSeconds = Number.isNaN(lastIndexedMs)
    ? 0
    : (nowMs - lastIndexedMs) / 1000;

  return Math.max(blockLagSeconds, timeLagSeconds, 0);
}

export default function IndexerStatusBanner() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const now = useNow();

  const fetchStatus = useCallback(async () => {
    const response = await api.getStatus(network);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch indexer status');
    }
    return response.data;
  }, [network]);

  const { data: status } = useApiData<StatusResponse>(
    fetchStatus,
    ['indexer-status', network],
    { refetchInterval: INDEXER_STATUS_POLL_MS }
  );

  if (!status) {
    return null;
  }

  const backfill = status.backfill;
  if (backfill?.active) {
    return (
      <div
        role="status"
        className="sticky top-[var(--header-height)] z-40 border-b border-dividerBlue bg-darkBlue"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-sm text-lightBlue">
          <DatabaseBackup className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Indexer is backfilling history — {formatPercent(backfill.progress_percent)} complete,{' '}
            {formatNumber(backfill.remaining_blocks)} blocks remaining. Data may be incomplete.
          </span>
        </div>
      </div>
    );
  }

  const lagSeconds = computeLagSeconds(status, now);
  if (lagSeconds > INDEXER_LAG_THRESHOLD_SECONDS) {
    return (
      <div
        role="status"
        className="sticky top-[var(--header-height)] z-40 border-b border-yellow-400/30 bg-[#221f11]"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-sm text-yellow-100">
          <TriangleAlert className="h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />
          <span>
            Indexer is {formatDuration(lagSeconds)} behind the chain head (last indexed block{' '}
            {formatNumber(status.last_indexed_block)}). Recent data may be incomplete.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
