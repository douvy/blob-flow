"use client";

import Link from '@/components/NetworkLink';
import { ArrowRight } from 'lucide-react';
import React from 'react';
import { useFlippening } from '../hooks/useFlippening';
import type { FlippeningEntity } from '../lib/flippening';
import AttributionBadge from './AttributionBadge';
import { RelativeTime } from './RelativeTime';

function formatPoints(value: number): string {
  return value.toFixed(1);
}

/** A rollup's logo and name, kept together so neither wraps away from the other. */
function Rollup({ entity }: { entity: FlippeningEntity }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap align-middle">
      <AttributionBadge user={entity.name} sizeClass="h-4 w-4" px={16} showTestnetLabel={false} />
      <span className="text-white">{entity.name}</span>
    </span>
  );
}

/**
 * One-line flippening status for the homepage: the newest crossover if one
 * happened in the window, otherwise how close the tightest race is. Shares
 * its request with the /flippening page via useFlippening, so the strip and
 * the full page can never disagree.
 *
 * Only the two rollups named in the sentence carry logos. An earlier version
 * showed the top four by share, which had nothing to do with the sentence
 * beside it and took the width the sentence needed to stay readable.
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

  const summaryLabel = latestFlip
    ? `${latestFlip.winner.name} flipped ${latestFlip.loser.name} in ${timeRange} share`
    : gap
      ? `${gap.trailer.name} trails ${gap.leader.name} by ${formatPoints(gap.gapPoints)} points in ${timeRange} share`
      : 'no rollups to compare yet';

  return (
    <section>
      <Link
        href="/flippening"
        aria-label={`Flippening watch: ${summaryLabel}. View details.`}
        className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 py-3 transition-colors hover:from-[#1f2127]/70 hover:to-[#23252b]/70 sm:flex-nowrap"
      >
        <span className="shrink-0 font-windsor-bold text-xl leading-none text-white pt-[2px]">
          Flippening
        </span>
        {/* The sentence is the point of the strip, so it gets the free space
            and wraps rather than truncating: a clipped "6..." tells nobody
            anything. The window is left out because the header's time filter
            is already on screen, and naming it here cost the width that made
            the sentence wrap. Details stays pinned right on one line from sm
            up. */}
        <span className="text-sm leading-snug text-[#8a93a5] sm:min-w-0 sm:flex-1">
          {latestFlip ? (
            <>
              <Rollup entity={latestFlip.winner} /> flipped <Rollup entity={latestFlip.loser} />{' '}
              <span className="whitespace-nowrap text-[#6e7787]">
                · <RelativeTime timestamp={latestFlip.timestamp} />
              </span>
            </>
          ) : gap ? (
            <>
              <Rollup entity={gap.trailer} /> trails <Rollup entity={gap.leader} />{' '}
              <span className="whitespace-nowrap text-[#6e7787]">
                by <span className="tabular-nums">{formatPoints(gap.gapPoints)} pts</span>
              </span>
            </>
          ) : (
            'not enough rollups with blob activity to compare'
          )}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 self-center text-sm text-blue">
          Details
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </section>
  );
}
