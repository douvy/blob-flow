"use client";

import React, { useCallback, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import { useTimeRange } from '@/contexts/TimeRangeContext';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { getBackendChartRange } from '@/lib/chartAggregation';
import {
  DEFAULT_FLIPPENING_TOP_N,
  analyzeFlippening,
  type FlippeningEvent,
  type FlippeningGap,
} from '@/lib/flippening';
import type { BackendAttributionUsageChartResponse } from '@/types';

const FEED_LIMIT = 20;
const REFRESH_INTERVAL_MS = 60_000;

/** Bucket timestamps within a day are unambiguous as time-of-day; longer
 * ranges use daily-or-coarser buckets, where the date is the signal. */
function formatEventTime(iso: string, includeDate: boolean): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  if (!includeDate) return `${time} UTC`;
  const day = date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${day}, ${time} UTC`;
}

function formatPoints(value: number): string {
  return value.toFixed(1);
}

function GapIndicator({ gap, rangeLabel }: { gap: FlippeningGap; rangeLabel: string }) {
  // Bar lengths are relative to the leader so the pair always fills the card,
  // making small gaps read as "almost there" at a glance.
  const trailerWidthPercent =
    gap.leaderSharePercent > 0
      ? Math.max(2, (gap.trailerSharePercent / gap.leaderSharePercent) * 100)
      : 0;

  return (
    <div className="rounded-lg border border-divider bg-[#17181b] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[#6e7787] mb-2">
        Closest to flipping
      </div>
      <p className="text-sm text-white mb-3">
        <span className="font-medium">{gap.trailer.name}</span> trails{' '}
        <span className="font-medium">{gap.leader.name}</span> by{' '}
        <span className="font-medium tabular-nums">{formatPoints(gap.gapPoints)} pts</span> in{' '}
        {rangeLabel} blob share.
      </p>
      <div className="space-y-2">
        {[
          { entity: gap.leader, share: gap.leaderSharePercent, width: 100, barClass: 'bg-blue' },
          {
            entity: gap.trailer,
            share: gap.trailerSharePercent,
            width: trailerWidthPercent,
            barClass: 'bg-[#6e7787]',
          },
        ].map(({ entity, share, width, barClass }) => (
          <div key={entity.key} className="flex items-center gap-2">
            <AttributionBadge user={entity.name} sizeClass="h-4 w-4" px={16} />
            <span className="w-24 truncate text-xs text-bodyText">{entity.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#26282e] overflow-hidden">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs text-white tabular-nums">
              {formatPoints(share)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, includeDate }: { event: FlippeningEvent; includeDate: boolean }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex items-center">
        <AttributionBadge user={event.winner.name} sizeClass="h-5 w-5" title={event.winner.name} />
        <ArrowLeftRight className="mx-1 h-3 w-3 text-[#6e7787]" aria-hidden="true" />
        <AttributionBadge user={event.loser.name} sizeClass="h-5 w-5" title={event.loser.name} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-white">
          <span className="font-medium">{event.winner.name}</span> flipped{' '}
          <span className="font-medium">{event.loser.name}</span> in blobs/bucket at{' '}
          <span className="tabular-nums">{formatEventTime(event.timestamp, includeDate)}</span>
        </p>
        <p className="text-xs text-[#8a93a5] tabular-nums">
          {formatPoints(event.winnerSharePercent)}% vs {formatPoints(event.loserSharePercent)}% of
          that bucket&apos;s blobs
        </p>
      </div>
    </li>
  );
}

export default function FlippeningWatch() {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const backendRange = getBackendChartRange(timeRange);

  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(backendRange, network),
    [backendRange, network]
  );

  const { data, isLoading, error } = useApiData<BackendAttributionUsageChartResponse>(
    fetchAttribution,
    // Shares the cache with useChartData's attribution query on purpose.
    ['chart-attribution', network, backendRange],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );

  const analysis = useMemo(() => (data ? analyzeFlippening(data) : null), [data]);

  // Feed reads newest first; detection returns oldest first.
  const feedEvents = useMemo(
    () => (analysis ? [...analysis.events].reverse().slice(0, FEED_LIMIT) : []),
    [analysis]
  );

  const includeDate = timeRange === '7d' || timeRange === '30d';

  return (
    <DataStateWrapper
      isLoading={isLoading && !data}
      error={data ? null : error}
      loadingComponent={
        <div className="h-64 animate-pulse rounded-lg border border-divider bg-[#14161a]" />
      }
    >
      {analysis && (
        <div className="space-y-6">
          {analysis.closestGap ? (
            <GapIndicator gap={analysis.closestGap} rangeLabel={timeRange} />
          ) : (
            <div className="rounded-lg border border-divider bg-[#17181b] p-4 text-sm text-[#8a93a5]">
              Not enough entities with blob activity in this window to compare.
            </div>
          )}

          <div className="rounded-lg border border-divider bg-[#17181b]">
            <div className="border-b border-divider px-4 py-3 text-[10px] uppercase tracking-wider text-[#6e7787]">
              Recent flippenings ({timeRange} window)
            </div>
            {feedEvents.length > 0 ? (
              <ul className="divide-y divide-divider px-4">
                {feedEvents.map((event) => (
                  <EventRow
                    key={`${event.bucketIndex}-${event.winner.key}-${event.loser.key}`}
                    event={event}
                    includeDate={includeDate}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-[#8a93a5]">
                No flippenings among the top {DEFAULT_FLIPPENING_TOP_N} entities in this window.
              </p>
            )}
          </div>
        </div>
      )}
    </DataStateWrapper>
  );
}
