"use client";

import React from 'react';

const ANIMATION_DURATION = 450;
const ANIMATION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function safeFinish(animation: Animation): void {
  try {
    animation.finish();
  } catch {
    // finish() can throw if the animation has no finite end (not our case),
    // or if the implementation is incomplete (e.g. jsdom). Either way, ignore.
  }
}

function safeCancel(animation: Animation): void {
  try {
    animation.cancel();
  } catch {
    // See safeFinish.
  }
}

/**
 * Animate table rows when their order or membership changes.
 *
 * Tag each `<tr>` with a stable `data-row-key` attribute. The hook compares
 * the current row order/identity to the previous render; when it changes,
 * it FLIP-animates surviving rows from their previous position to the new one
 * and fade-slides any rows whose key is new.
 *
 * Important: live tables in this app re-render on every websocket tick (they
 * consume the `latestEvents` context), not just when their own row set
 * changes. We therefore:
 *   1. Gate on a row-key signature, so unrelated re-renders are no-ops; and
 *   2. Finish any FLIP animations we previously started before re-measuring,
 *      so `getBoundingClientRect()` returns clean layout positions instead of
 *      animated visual ones (which would compound and drift rows off-screen).
 *
 * The first commit and the first commit after `resetKey` changes capture
 * positions without animating, so initial loads and network switches don't
 * trigger a stampede.
 */
export function useFlipRows(
  tbodyRef: React.RefObject<HTMLTableSectionElement | null>,
  resetKey: unknown
): void {
  const prevPositionsRef = React.useRef<Map<string, number> | null>(null);
  const prevSignatureRef = React.useRef<string | null>(null);
  const prevResetKeyRef = React.useRef(resetKey);
  const activeAnimationsRef = React.useRef<Animation[]>([]);

  React.useLayoutEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      prevPositionsRef.current = null;
      prevSignatureRef.current = null;
      activeAnimationsRef.current.forEach(safeCancel);
      activeAnimationsRef.current = [];
    }

    const tbody = tbodyRef.current;
    if (!tbody) return;

    const rows = Array.from(
      tbody.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]')
    );
    const signature = rows.map((row) => row.dataset.rowKey ?? '').join('|');

    // Bail out when the row order/identity is unchanged. Tables in this app
    // re-render on every `latestEvents` context update; without this gate we
    // would re-measure (and re-baseline) during in-flight animations on every
    // websocket tick, causing transforms to compound off-screen.
    if (signature === prevSignatureRef.current) return;

    // Finish FLIP animations from a previous pass so `getBoundingClientRect()`
    // reflects each row's layout position, not its mid-animation visual one.
    activeAnimationsRef.current.forEach(safeFinish);
    activeAnimationsRef.current = [];

    const newPositions = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.dataset.rowKey;
      if (key) newPositions.set(key, row.getBoundingClientRect().top);
    });

    const prevPositions = prevPositionsRef.current;
    prevPositionsRef.current = newPositions;
    prevSignatureRef.current = signature;

    if (!prevPositions) return;
    if (prefersReducedMotion()) return;

    const nextAnimations: Animation[] = [];
    rows.forEach((row) => {
      const key = row.dataset.rowKey;
      if (!key || typeof row.animate !== 'function') return;

      const newTop = newPositions.get(key);
      if (newTop === undefined) return;

      const oldTop = prevPositions.get(key);
      if (oldTop === undefined) {
        nextAnimations.push(
          row.animate(
            [
              { opacity: 0, transform: 'translateY(-16px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: ANIMATION_DURATION, easing: ANIMATION_EASING, fill: 'backwards' }
          )
        );
        return;
      }

      const delta = oldTop - newTop;
      if (Math.abs(delta) > 0.5) {
        nextAnimations.push(
          row.animate(
            [
              { transform: `translateY(${delta}px)` },
              { transform: 'translateY(0)' },
            ],
            { duration: ANIMATION_DURATION, easing: ANIMATION_EASING }
          )
        );
      }
    });

    activeAnimationsRef.current = nextAnimations;
  });
}
