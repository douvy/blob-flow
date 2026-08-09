"use client";

import Link from '@/components/NetworkLink';
import { ArrowRight } from 'lucide-react';
import React from 'react';
import { useFlippening } from '../hooks/useFlippening';
import AttributionBadge from './AttributionBadge';
import { RelativeTime } from './RelativeTime';

const ICON_CLUSTER_LIMIT = 4;

function formatPoints(value: number): string {
  return value.toFixed(1);
}

/**
 * One-line flippening status for the homepage: the newest crossover if one
 * happened in the window, otherwise how close the tightest race is. Shares
 * its request with the /flippening page via useFlippening, so the strip and
 * the full page can never disagree. Fixed height, like MempoolSummary, so
 * the dashboard does not shift as the numbers refresh.
 */
export default function FlippeningSummary() {
  const { analysis, timeRange, isLoading } = useFlippening();

  if (isLoading) {
    return (
      <section>
        <div className="h-[46px] animate-pulse rounded-lg border border-divider bg-[#14161a]" />
      </section>
    );
  }

  const latestFlip = analysis?.events[analysis.events.length - 1] ?? null;
  const gap = analysis?.closestGap ?? null;
  const leaders = analysis?.standings.slice(0, ICON_CLUSTER_LIMIT) ?? [];

  const summaryLabel = latestFlip
    ? `${latestFlip.winner.name} flipped ${latestFlip.loser.name}`
    : gap
      ? `${gap.trailer.name} trails ${gap.leader.name} by ${formatPoints(gap.gapPoints)} pts`
      : 'no rollups to compare yet';

  return (
    <section>
      <Link
        href="/flippening"
        aria-label={`Flippening watch: ${summaryLabel}. View details.`}
        className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 py-3 transition-colors hover:from-[#1f2127]/70 hover:to-[#23252b]/70 sm:flex-nowrap"
      >
        <span className="shrink-0 font-windsor-bold text-xl leading-none text-white pt-[2px]">
          Flippening
        </span>
        {/* From sm up the status is the only flexible element and truncates,
            so the icons and Details stay on one line instead of wrapping the
            strip to a second row. Narrower than that there is no room to
            truncate without losing the sentence, so the strip wraps instead,
            matching the mempool summary above it. */}
        <span className="text-sm text-[#8a93a5] sm:min-w-0 sm:flex-1 sm:truncate">
          {latestFlip ? (
            <>
              <span className="text-white">{latestFlip.winner.name}</span> flipped{' '}
              <span className="text-white">{latestFlip.loser.name}</span> in {timeRange} share
              <span className="text-[#6e7787]">
                {' '}
                · <RelativeTime timestamp={latestFlip.timestamp} />
              </span>
            </>
          ) : gap ? (
            <>
              <span className="text-white">{gap.trailer.name}</span> trails{' '}
              <span className="text-white">{gap.leader.name}</span> by{' '}
              <span className="tabular-nums">{formatPoints(gap.gapPoints)} pts</span> in{' '}
              {timeRange} share
            </>
          ) : (
            'not enough rollups with blob activity to compare'
          )}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {leaders.length > 0 && (
            <span className="relative hidden items-center sm:flex" aria-hidden="true">
              {leaders.map((standing) => (
                <span
                  key={standing.entity.key}
                  className="-ml-1.5 flex rounded-full ring-2 ring-[#17181b] first:ml-0"
                  title={standing.entity.name}
                >
                  <AttributionBadge
                    user={standing.entity.name}
                    sizeClass="h-5 w-5"
                    showTestnetLabel={false}
                  />
                </span>
              ))}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-blue">
            Details
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </span>
      </Link>
    </section>
  );
}
