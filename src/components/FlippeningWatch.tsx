"use client";

import React, { useMemo } from 'react';
import { ArrowLeftRight, ArrowUp } from 'lucide-react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import { RelativeTime } from '@/components/RelativeTime';
import TapTooltip from '@/components/TapTooltip';
import { useFlippening } from '@/hooks/useFlippening';
import {
  DEFAULT_FLIPPENING_TOP_N,
  type FlippeningEvent,
  type FlippeningGap,
  type FlippeningStanding,
} from '@/lib/flippening';

const FEED_LIMIT = 20;

const ABSOLUTE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Exact time in both zones, for the hover behind a relative timestamp. UTC
 * is what the chain and the rest of this app speak; the viewer's own zone is
 * what they can place against their day. Rendered client-side only (the feed
 * has no data until the query resolves), so the local reading cannot differ
 * between server and client.
 */
function AbsoluteTimes({ iso }: { iso: string }) {
  const date = new Date(iso);
  // Both lines are labelled: near midnight the two zones land on different
  // calendar days, and an unlabelled pair of dates invites a misread.
  return (
    <span className="block whitespace-nowrap">
      <span className="block">
        <span className="text-[#6e7787]">UTC</span>{' '}
        <span className="tabular-nums">
          {date.toLocaleString('en-GB', { ...ABSOLUTE_TIME_FORMAT, timeZone: 'UTC' })}
        </span>
      </span>
      <span className="block">
        <span className="text-[#6e7787]">Local</span>{' '}
        <span className="tabular-nums">
          {date.toLocaleString('en-GB', { ...ABSOLUTE_TIME_FORMAT, timeZoneName: 'short' })}
        </span>
      </span>
    </span>
  );
}

/**
 * Relative timestamp, with the exact UTC and local times on hover or tap.
 * "3 hours ago" is what a reader actually wants from a feed; the precise
 * moment only matters when they go looking for it.
 */
function EventTime({ iso }: { iso: string }) {
  return (
    <TapTooltip
      contentClassName="px-2.5 py-2 text-[11px] leading-relaxed"
      content={<AbsoluteTimes iso={iso} />}
    >
      <button
        type="button"
        className="cursor-help rounded-sm underline decoration-dotted decoration-[#4a5261] underline-offset-2 transition-colors hover:decoration-[#8a93a5] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
      >
        <RelativeTime timestamp={iso} />
      </button>
    </TapTooltip>
  );
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

/**
 * Current ranking of every tracked rollup, so the page shows who has already
 * changed places rather than only the pair about to. Rows that won or lost a
 * flip inside the fetched history are called out.
 */
function Standings({
  standings,
  windowLabel,
  closestPairKeys,
}: {
  standings: FlippeningStanding[];
  windowLabel: string;
  closestPairKeys: ReadonlySet<string>;
}) {
  const topShare = standings[0]?.sharePercent ?? 0;

  return (
    <div className="rounded-lg border border-divider bg-[#17181b]">
      <div className="border-b border-divider px-4 py-3 text-[10px] uppercase tracking-wider text-[#6e7787]">
        Standings in {windowLabel} blob share
      </div>
      <ul className="divide-y divide-divider px-4">
        {standings.map((standing) => {
          const barWidth = topShare > 0 ? Math.max(2, (standing.sharePercent / topShare) * 100) : 0;
          const inClosestPair = closestPairKeys.has(standing.entity.key);
          return (
            <li key={standing.entity.key} className="flex items-center gap-3 py-2.5">
              <span className="w-4 text-right text-xs text-[#6e7787] tabular-nums">
                {standing.rank}
              </span>
              <AttributionBadge user={standing.entity.name} sizeClass="h-5 w-5" />
              <div className="min-w-0 flex-1">
                {/* Wraps rather than overflowing: the badges are as wide as the
                    names inside them, so on a narrow viewport they would run
                    under the share column if they stayed on the name's line. */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm text-white">{standing.entity.name}</span>
                  {standing.lastFlipWon && (
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm bg-green/10 px-1.5 py-0.5 text-[10px] text-green">
                      <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">passed {standing.lastFlipWon.loser.name}</span>
                      <span className="shrink-0">
                        <EventTime iso={standing.lastFlipWon.timestamp} />
                      </span>
                    </span>
                  )}
                  {inClosestPair && (
                    <span className="shrink-0 rounded-sm bg-blue/10 px-1.5 py-0.5 text-[10px] text-blue">
                      closest race
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#26282e] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${standing.rank === 1 ? 'bg-blue' : 'bg-[#6e7787]'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right">
                <div className="text-sm text-white tabular-nums">
                  {formatPoints(standing.sharePercent)}%
                </div>
                {standing.gapToAbovePoints !== null && (
                  <div className="text-[10px] text-[#6e7787] tabular-nums">
                    {formatPoints(standing.gapToAbovePoints)} pts behind
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EventRow({ event, windowLabel }: { event: FlippeningEvent; windowLabel: string }) {
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
          <span className="font-medium">{event.loser.name}</span> in {windowLabel} blob share{' '}
          <EventTime iso={event.timestamp} />
        </p>
        <p className="text-xs text-[#8a93a5] tabular-nums">
          {formatPoints(event.winnerSharePercent)}% vs {formatPoints(event.loserSharePercent)}% of
          blobs over the {windowLabel} before that
        </p>
      </div>
    </li>
  );
}

export default function FlippeningWatch() {
  const { analysis, timeRange, isLoading, error } = useFlippening();

  // Feed reads newest first; detection returns oldest first.
  const feedEvents = useMemo(
    () => (analysis ? [...analysis.events].reverse().slice(0, FEED_LIMIT) : []),
    [analysis]
  );

  const closestPairKeys = useMemo(
    () =>
      new Set(
        analysis?.closestGap
          ? [analysis.closestGap.leader.key, analysis.closestGap.trailer.key]
          : []
      ),
    [analysis]
  );

  return (
    <DataStateWrapper
      isLoading={isLoading}
      error={analysis ? null : error}
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
              Not enough rollups with blob activity in this window to compare.
            </div>
          )}

          {analysis.standings.length > 0 && (
            <Standings
              standings={analysis.standings}
              windowLabel={timeRange}
              closestPairKeys={closestPairKeys}
            />
          )}

          <div className="rounded-lg border border-divider bg-[#17181b]">
            <div className="border-b border-divider px-4 py-3 text-[10px] uppercase tracking-wider text-[#6e7787]">
              Recent flippenings in {timeRange} blob share
            </div>
            {feedEvents.length > 0 ? (
              <ul className="divide-y divide-divider px-4">
                {feedEvents.map((event) => (
                  <EventRow
                    key={`${event.bucketIndex}-${event.winner.key}-${event.loser.key}`}
                    event={event}
                    windowLabel={timeRange}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-[#8a93a5]">
                No flippenings among the top {DEFAULT_FLIPPENING_TOP_N} rollups in this window.
              </p>
            )}
          </div>
        </div>
      )}
    </DataStateWrapper>
  );
}
