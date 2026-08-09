"use client";

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimeRange } from '@/contexts/TimeRangeContext';
import { isTimeRange } from '@/constants';

/**
 * Applies a ?range= deep link to the shared time range. Shared chart links
 * carry the range they were captured at, so the page has to open on that
 * range instead of the header default.
 *
 * Keyed on the parameter's value rather than a once-per-mount flag: browser
 * history and in-app navigation swap the range without remounting, and a
 * one-shot guard would leave the chart on the previous range while the URL
 * and the page metadata said otherwise. Header changes still win, since the
 * effect only re-runs when the URL itself changes.
 *
 * Callers must sit inside a Suspense boundary: useSearchParams opts the
 * subtree into client rendering on statically prerendered pages.
 */
export function useDeepLinkedTimeRange() {
  const searchParams = useSearchParams();
  const { setTimeRange } = useTimeRange();
  const rangeParam = searchParams.get('range');
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (applied.current === rangeParam || !isTimeRange(rangeParam)) return;
    applied.current = rangeParam;
    setTimeRange(rangeParam);
  }, [rangeParam, setTimeRange]);
}
