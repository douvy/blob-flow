"use client";

import Link from '@/components/NetworkLink';
import { ArrowRight } from 'lucide-react';
import React from 'react';
import { FLIPPENING_WINDOW_SECONDS, useFlippening } from '../hooks/useFlippening';
import type { TimeRange } from '../contexts/TimeRangeContext';
import { formatGapPoints, type FlippeningEntity, type FlippeningEvent } from '../lib/flippening';
import AttributionBadge from './AttributionBadge';
import { RelativeTime } from './RelativeTime';

/**
 * "<0.1" is a glyph a screen reader has no good reading for, so the spoken
 * label says it in words.
 */
function spokenPoints(label: string): string {
  return label.startsWith('<') ? `under ${label.slice(1)}` : label;
}

/**
 * A rollup's logo and name, kept together so neither wraps away from the
 * other. The name stays ordinary inline text rather than a flex item, so it
 * sits on the same baseline as the words around it; only the logo is nudged,
 * to centre a 16px mark against 14px text.
 */
function Rollup({ entity }: { entity: FlippeningEntity }) {
  return (
    <span className="whitespace-nowrap text-white">
      <AttributionBadge
        user={entity.name}
        sizeClass="h-4 w-4"
        px={16}
        showTestnetLabel={false}
        className="mr-1.5 align-[-0.23em]"
      />
      {entity.name}
    </span>
  );
}

/**
 * The newest crossover that happened inside the selected window, or null.
 *
 * The analysis covers more history than the window on purpose (a 24h filter
 * reads 7d, a 30d filter reads all time) so the rolling share has room to
 * move. Its events therefore reach back further than the strip is about, and
 * taking the last one outright led the 24h view with flips from days earlier
 * while suppressing the current close race.
 */
export function newestFlipInWindow(
  events: FlippeningEvent[] | undefined,
  timeRange: TimeRange,
  now: number = Date.now()
): FlippeningEvent | null {
  if (!events?.length) return null;

  const earliest = now - FLIPPENING_WINDOW_SECONDS[timeRange] * 1000;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const at = Date.parse(events[index].timestamp);
    // Unparseable timestamps cannot be placed in the window, so they are not
    // claimed to be recent.
    if (Number.isFinite(at) && at >= earliest) return events[index];
  }

  return null;
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

  const latestFlip = newestFlipInWindow(analysis?.events, timeRange);
  const gap = analysis?.closestGap ?? null;
  // Null once the pair is level, which the sentence says in words instead of
  // reporting a gap of zero.
  const gapLabel = gap ? formatGapPoints(gap.gapPoints) : null;

  const summaryLabel = latestFlip
    ? `${latestFlip.winner.name} flipped ${latestFlip.loser.name} in ${timeRange} share`
    : gap
      ? gapLabel === null
        ? `${gap.trailer.name} is level with ${gap.leader.name} in ${timeRange} share`
        : `${gap.trailer.name} trails ${gap.leader.name} by ${spokenPoints(gapLabel)} points in ${timeRange} share`
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
            gapLabel === null ? (
              <>
                <Rollup entity={gap.trailer} /> is level with <Rollup entity={gap.leader} />
              </>
            ) : (
              <>
                <Rollup entity={gap.trailer} /> trails <Rollup entity={gap.leader} />{' '}
                <span className="whitespace-nowrap text-[#6e7787]">
                  by <span className="tabular-nums">{gapLabel} pts</span>
                </span>
              </>
            )
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
