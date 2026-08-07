"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_TIME_RANGE,
  TIME_RANGE_PARAM,
  parseTimeRange,
  type TimeRange,
} from '@/lib/timeRange';

export type { TimeRange };

// The selected range is an external store (module state synced with the URL)
// read via useSyncExternalStore. That keeps server and client hydration
// markup identical (the server snapshot is the default range), lets a shared
// ?range= URL restore the selection right after hydration, and follows
// browser back/forward through popstate.
let currentRange: TimeRange | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readUrlRange(): TimeRange | null {
  return parseTimeRange(new URLSearchParams(window.location.search).get(TIME_RANGE_PARAM));
}

function getSnapshot(): TimeRange {
  if (currentRange === null) {
    currentRange = readUrlRange() ?? DEFAULT_TIME_RANGE;
  }
  return currentRange;
}

function getServerSnapshot(): TimeRange {
  return DEFAULT_TIME_RANGE;
}

function subscribe(listener: () => void): () => void {
  const onPopState = () => {
    const fromUrl = readUrlRange();
    if (fromUrl && fromUrl !== currentRange) {
      currentRange = fromUrl;
      emit();
    }
  };

  listeners.add(listener);
  window.addEventListener('popstate', onPopState);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', onPopState);
  };
}

function setTimeRange(range: TimeRange) {
  if (range === currentRange) return;
  currentRange = range;
  emit();
}

/** Test-only: forget the cached range so each test starts from the URL. */
export function resetTimeRangeStoreForTests() {
  currentRange = null;
}

// The header only shows the time filter on these routes, so only their URLs
// carry the range param (it would be meaningless noise elsewhere).
function pathUsesTimeRange(pathname: string | null): boolean {
  return pathname === '/' || Boolean(pathname?.startsWith('/charts/'));
}

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  timeRange: DEFAULT_TIME_RANGE,
  setTimeRange: () => {},
});

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const timeRange = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  // Reflect the selection in the URL so sharing the page (and its Open Graph
  // card) carries the timeframe. Re-runs on navigation because client-side
  // transitions drop query params. replaceState keeps Next's router state.
  useEffect(() => {
    if (!pathUsesTimeRange(pathname)) return;

    const url = new URL(window.location.href);
    const current = url.searchParams.get(TIME_RANGE_PARAM);

    if (timeRange === DEFAULT_TIME_RANGE) {
      if (current === null) return;
      url.searchParams.delete(TIME_RANGE_PARAM);
    } else {
      if (current === timeRange) return;
      url.searchParams.set(TIME_RANGE_PARAM, timeRange);
    }

    window.history.replaceState(window.history.state, '', url);
  }, [timeRange, pathname]);

  const value = useMemo(() => ({ timeRange, setTimeRange }), [timeRange]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
