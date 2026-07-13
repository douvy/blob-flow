"use client";

import React from 'react';
import { DatabaseBackup, TriangleAlert } from 'lucide-react';
import { useIndexerStatus } from '../hooks/useIndexerStatus';
import { useNow } from '../hooks/useNow';
import { StatusResponse } from '../types';
import {
  BACKFILL_MIN_REMAINING_BLOCKS,
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

/**
 * Percent of the full blob-era range (earliest indexed block to chain head)
 * that is indexed. `backfill.progress_percent` only measures the current
 * backfill run, whose range is arbitrary, so it is misleading as a coverage
 * number. Approximates the unindexed count with the active backfill's
 * remaining blocks, which holds while that remainder is the only gap.
 * Returns null when the backend does not report the needed fields, or
 * reports values that do not yield a finite percentage.
 */
export function computeBackfillCoveragePercent(status: StatusResponse): number | null {
  const backfill = status.backfill;
  const head = status.current_chain_head;
  const earliest = status.earliest_indexed_block;
  if (!backfill || head === undefined || earliest === undefined) {
    return null;
  }

  const totalRange = head - earliest + 1;
  const coverage = ((totalRange - backfill.remaining_blocks) / totalRange) * 100;
  if (totalRange <= 0 || !Number.isFinite(coverage)) {
    return null;
  }

  return Math.min(100, Math.max(0, coverage));
}

export default function IndexerStatusBanner() {
  const now = useNow();

  const { data: status } = useIndexerStatus({ refetchInterval: INDEXER_STATUS_POLL_MS });

  if (!status) {
    return null;
  }

  const backfill = status.backfill;
  const backfillInProgress =
    backfill?.active && backfill.remaining_blocks >= BACKFILL_MIN_REMAINING_BLOCKS;
  const coveragePercent = computeBackfillCoveragePercent(status);
  const backfillProgressText = backfillInProgress
    ? coveragePercent !== null
      ? `${formatPercent(coveragePercent)} of blob history indexed`
      : `${formatPercent(backfill.progress_percent)} complete`
    : null;
  const lagSeconds = computeLagSeconds(status, now);

  if (lagSeconds > INDEXER_LAG_THRESHOLD_SECONDS) {
    return (
      <div
        role="status"
        className="sticky top-[var(--header-height)] z-30 border-b border-yellow-400/30 bg-[#221f11]"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-sm text-yellow-100">
          <TriangleAlert className="h-4 w-4 shrink-0 text-yellow-400" aria-hidden="true" />
          <span>
            Indexer is {formatDuration(lagSeconds)} behind the chain head (last indexed block{' '}
            {formatNumber(status.last_indexed_block)}). Recent data may be incomplete.
            {backfillProgressText && <> Backfilling: {backfillProgressText}.</>}
          </span>
        </div>
      </div>
    );
  }

  if (backfillInProgress) {
    return (
      <div
        role="status"
        className="sticky top-[var(--header-height)] z-30 border-b border-dividerBlue bg-darkBlue"
      >
        <div className="container mx-auto flex items-center gap-2 px-4 py-2 text-sm text-lightBlue">
          <DatabaseBackup className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Indexer is backfilling history: {backfillProgressText},{' '}
            {formatNumber(backfill.remaining_blocks)} blocks remaining. Data may be incomplete.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
