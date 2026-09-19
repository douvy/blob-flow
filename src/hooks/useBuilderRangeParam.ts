"use client";

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { DEFAULT_BUILDER_RANGE, isBuilderRange } from '@/lib/builders';
import type { BuilderRange } from '@/types';

export interface BuilderRangeParam {
  range: BuilderRange;
  setRange: (next: BuilderRange) => void;
}

/**
 * The ?range= window the builder views share.
 *
 * The URL is the only range state, so the leaderboard and the share chart read
 * the same window without a context between them, the address bar always
 * states the view on screen, a shared link opens on the window it was captured
 * at, and back/forward restore the range they left.
 *
 * Callers must sit inside a Suspense boundary: useSearchParams opts its
 * subtree into client rendering on a statically prerendered page.
 */
export function useBuilderRangeParam(): BuilderRangeParam {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get('range');
  const range: BuilderRange = isBuilderRange(rangeParam) ? rangeParam : DEFAULT_BUILDER_RANGE;

  const setRange = useCallback(
    (next: BuilderRange) => {
      if (next === range) return;
      trackEvent('time-range-change', { range: next, previous: range });
      // Replace rather than push: a filter change is not a navigation worth a
      // history entry. Unrelated query params survive the rewrite.
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, range, router, searchParams]
  );

  return { range, setRange };
}
