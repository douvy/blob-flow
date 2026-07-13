"use client";

import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes.
 *
 * SSR and the very first hydration render report `false` (the query is treated
 * as unmatched until the browser can evaluate it), so callers should make their
 * non-matching branch the wide/desktop layout to avoid a hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia(query).matches;
    },
    () => false
  );
}
