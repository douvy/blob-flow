"use client";

import React from 'react';
import AttributionBadge from '@/components/AttributionBadge';
import type { KioskMempool } from '@/lib/liveKiosk';

/**
 * Pending blob demand: how many blobs are queued, how many of them can afford
 * the current base fee, and how long the priced-in backlog would take to
 * drain. With a focused rollup, the caller passes counts already scoped to it
 * and the panel names the scope; the per-sender icon row is dropped since
 * every entry would be the same badge.
 *
 * Only the public mempool is visible, and the sample is capped, so the label
 * says "public" and truncated counts carry a "+" rather than reading as
 * exact. `mempool` is null until the first sample lands, which keeps the
 * panel from flashing zeros on load.
 */
export default function KioskMempoolPanel({
  mempool,
  focus = null,
  isUnavailable = false,
}: {
  mempool: KioskMempool | null;
  focus?: string | null;
  /** The mempool fetch failed and no sample was ever received. */
  isUnavailable?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* The focused title drops "public" for width; the panel body's lower
          bound framing still communicates the partial view. */}
      <h2 className="truncate text-[clamp(0.65rem,min(0.9vw,1.6vh),1rem)] font-medium uppercase tracking-[0.2em] text-[#6e7687]">
        {focus ? `Mempool · ${focus}` : 'Public mempool'}
      </h2>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <span
          className={`font-windsor-bold tabular-nums leading-none text-[clamp(1.75rem,min(4.5vw,8vh),4.5rem)] ${
            mempool && !mempool.isEmpty ? 'text-white' : 'text-[#6e7687]'
          }`}
        >
          {mempool ? mempool.pendingLabel : '-'}
        </span>
        <span className="mt-[0.35em] text-[clamp(0.65rem,min(0.95vw,1.7vh),1.05rem)] uppercase tracking-[0.2em] text-[#6e7687]">
          blobs waiting
        </span>

        {!focus && mempool && mempool.groups.length > 0 && (
          <ul
            className="mt-[1em] flex flex-wrap items-center gap-x-[0.9em] gap-y-[0.5em]"
            aria-label="Largest waiting senders"
          >
            {mempool.groups.map((group) => (
              <li key={group.name} className="flex items-center gap-[0.4em]">
                <AttributionBadge
                  user={group.name}
                  sizeClass="h-[clamp(1.1rem,min(1.6vw,2.8vh),1.9rem)] w-[clamp(1.1rem,min(1.6vw,2.8vh),1.9rem)]"
                  px={32}
                  textClass="text-[0.55em]"
                  title={group.name}
                />
                <span className="tabular-nums text-[clamp(0.75rem,min(1.1vw,1.9vh),1.2rem)] text-[#a9adb6]">
                  <span className="sr-only">{group.name}: </span>
                  {group.blobCount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-[0.2em] text-[clamp(0.7rem,min(1vw,1.8vh),1.15rem)] text-[#a9adb6]">
        {/* A failed fetch must not keep reading as "loading" under a Live
            badge: an unattended wall would show a permanent dash with no
            hint that this panel is the broken one. */}
        <p className={`truncate ${isUnavailable ? 'text-yellow-400' : ''}`}>
          {mempool ? mempool.includableLabel : isUnavailable ? 'unavailable' : 'loading'}
        </p>
        {mempool?.blocksToClearLabel && (
          <p className="truncate text-[#6e7687]">{mempool.blocksToClearLabel}</p>
        )}
      </div>
    </div>
  );
}
