"use client";

import React from 'react';

const ANIMATION_DURATION = 450;
const ANIMATION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate table rows when their order or membership changes.
 *
 * Tag each `<tr>` with a stable `data-row-key` attribute. After each render the
 * hook captures row positions; on the next render it FLIP-animates surviving
 * rows from their previous position to the new one and fade-slides any rows
 * whose key is new.
 *
 * The first commit (and the first commit after `resetKey` changes) only
 * captures positions — no animation plays — so switching networks or
 * initial data loads do not trigger a stampede.
 */
export function useFlipRows(
  tbodyRef: React.RefObject<HTMLTableSectionElement | null>,
  resetKey: unknown
): void {
  const prevPositionsRef = React.useRef<Map<string, number> | null>(null);
  const prevResetKeyRef = React.useRef(resetKey);

  React.useLayoutEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      prevPositionsRef.current = null;
    }

    const tbody = tbodyRef.current;
    if (!tbody) return;

    const newPositions = new Map<string, number>();
    tbody.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]').forEach((row) => {
      const key = row.dataset.rowKey;
      if (key) newPositions.set(key, row.getBoundingClientRect().top);
    });

    const prevPositions = prevPositionsRef.current;
    prevPositionsRef.current = newPositions;

    if (!prevPositions) return;
    if (prefersReducedMotion()) return;

    newPositions.forEach((newTop, key) => {
      const row = tbody.querySelector<HTMLTableRowElement>(
        `tr[data-row-key="${CSS.escape(key)}"]`
      );
      if (!row || typeof row.animate !== 'function') return;

      const oldTop = prevPositions.get(key);
      if (oldTop === undefined) {
        row.animate(
          [
            { opacity: 0, transform: 'translateY(-16px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: ANIMATION_DURATION, easing: ANIMATION_EASING, fill: 'backwards' }
        );
        return;
      }

      const delta = oldTop - newTop;
      if (Math.abs(delta) > 0.5) {
        row.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: ANIMATION_DURATION, easing: ANIMATION_EASING }
        );
      }
    });
  });
}
