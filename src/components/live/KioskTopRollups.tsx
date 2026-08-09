"use client";

import React from 'react';
import AttributionBadge from '@/components/AttributionBadge';
import { KIOSK_TOP_ROLLUPS, type KioskRollup } from '@/lib/liveKiosk';
import { formatPercent } from '@/utils';

/**
 * Leading rollups by share of blobs in the last hour.
 *
 * Rows are padded to a fixed count so the panel keeps its height while the
 * list is still loading or the window holds fewer senders than the limit.
 */
export default function KioskTopRollups({
  rollups,
  shareLabel,
  isUnavailable = false,
}: {
  rollups: KioskRollup[];
  shareLabel: string;
  /** The rollup fetch failed and no rows were ever received. */
  isUnavailable?: boolean;
}) {
  const emptyRows = Math.max(0, KIOSK_TOP_ROLLUPS - rollups.length);

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-[clamp(0.65rem,min(0.9vw,1.6vh),1rem)] font-medium uppercase tracking-[0.2em] text-[#6e7687]">
        Top rollups · {shareLabel}
        {isUnavailable && <span className="ml-2 text-yellow-400">unavailable</span>}
      </h2>
      {/* min-h-0 lets the list shrink inside the panel instead of spilling out
          of it on shorter displays such as 1280x720. */}
      <ul className="mt-[0.7em] flex min-h-0 flex-1 flex-col justify-between gap-[0.4em] overflow-hidden">
        {rollups.map((rollup) => (
          <li key={rollup.name} className="flex items-center gap-3">
            <AttributionBadge
              user={rollup.name}
              sizeClass="h-[clamp(1.1rem,min(1.7vw,3vh),2rem)] w-[clamp(1.1rem,min(1.7vw,3vh),2rem)]"
              px={32}
              textClass="text-[0.6em]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`truncate text-[clamp(0.8rem,min(1.2vw,2.1vh),1.4rem)] ${
                    rollup.isFocused ? 'font-medium text-lightBlue' : 'text-white'
                  }`}
                >
                  {rollup.name}
                </span>
                {/* Without server-side shares the percentage would only be a
                    share of these rows, not of the hour, so show the blob
                    count instead of a number that overclaims its denominator. */}
                <span
                  className={`shrink-0 tabular-nums text-[clamp(0.8rem,min(1.2vw,2.1vh),1.4rem)] ${
                    rollup.isFocused ? 'text-lightBlue' : 'text-[#a9adb6]'
                  }`}
                >
                  {rollup.sharePercent === null
                    ? `${rollup.blobCount.toLocaleString()} blobs`
                    : formatPercent(rollup.sharePercent, 1)}
                </span>
              </div>
              <div className="mt-[0.3em] h-[0.35em] overflow-hidden rounded-full bg-[#1d1f23]">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                    rollup.isFocused ? 'bg-lightBlue' : 'bg-blue'
                  }`}
                  style={{ width: `${rollup.barPercent}%` }}
                />
              </div>
            </div>
          </li>
        ))}

        {Array.from({ length: emptyRows }, (_, index) => (
          <li
            key={`rollup-placeholder-${index}`}
            aria-hidden="true"
            className="flex items-center gap-3 opacity-30"
          >
            <span className="h-[clamp(1.1rem,min(1.7vw,3vh),2rem)] w-[clamp(1.1rem,min(1.7vw,3vh),2rem)] shrink-0 rounded-full bg-[#1d1f23]" />
            <div className="min-w-0 flex-1">
              <div className="h-[1.2em]" />
              <div className="mt-[0.3em] h-[0.35em] rounded-full bg-[#1d1f23]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
