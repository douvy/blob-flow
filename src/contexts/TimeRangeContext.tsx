"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { useParams, usePathname } from 'next/navigation';
import { DEFAULT_TIME_RANGE, isTimeRange, type TimeRange } from '@/constants';
import { stripNetworkPath } from '@/utils';

export type { TimeRange };

/** Query param carrying the selected range in shareable URLs. */
export const TIME_RANGE_PARAM = 'range';

/**
 * The selected range is an external store synced with the URL, read through
 * useSyncExternalStore. Keeping it outside React state is what lets the
 * server snapshot stay the default (so hydration markup matches), a shared
 * ?range= link restore the selection immediately after hydration, and browser
 * back/forward follow along through popstate.
 */
let currentRange: TimeRange | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readUrlRange(): TimeRange | null {
  const value = new URLSearchParams(window.location.search).get(TIME_RANGE_PARAM);
  return isTimeRange(value) ? value : null;
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

/** Test-only: forget the cached range so each test starts from its own URL. */
export function resetTimeRangeStoreForTests() {
  currentRange = null;
}

// The header only offers the time filter on these routes, so only their URLs
// carry the param (it would be meaningless noise elsewhere). Which page is
// showing is a property of the route, not of the network it is scoped to, so
// this compares against the unscoped path.
function pathUsesTimeRange(pathname: string | null, networkSegment: string | null): boolean {
  if (!pathname) return false;

  const path = networkSegment ? stripNetworkPath(pathname, [networkSegment]) : pathname;
  return path === '/' || path.startsWith('/charts/');
}

interface TimeRangeContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

const TimeRangeContext = createContext<TimeRangeContextValue>({
  timeRange: DEFAULT_TIME_RANGE,
  setTimeRange: () => {},
});

export function TimeRangeProvider({
  children,
  initialRange,
}: {
  children: ReactNode;
  /**
   * Seeds the range directly, for callers rendering a fixed view. Such a
   * provider is self-contained: it neither reads nor writes the URL, so the
   * range it was given is the range it keeps.
   */
  initialRange?: TimeRange;
}) {
  if (initialRange !== undefined) {
    return <SeededTimeRangeProvider initialRange={initialRange}>{children}</SeededTimeRangeProvider>;
  }

  return <UrlSyncedTimeRangeProvider>{children}</UrlSyncedTimeRangeProvider>;
}

function SeededTimeRangeProvider({
  children,
  initialRange,
}: {
  children: ReactNode;
  initialRange: TimeRange;
}) {
  const [timeRange, setSeededRange] = useState<TimeRange>(initialRange);
  const value = useMemo(
    () => ({ timeRange, setTimeRange: setSeededRange }),
    [timeRange]
  );

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

function UrlSyncedTimeRangeProvider({ children }: { children: ReactNode }) {
  const timeRange = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();
  // Set only on the /[network] routes, naming the segment to drop.
  const routeParams = useParams();
  const networkSegment = typeof routeParams?.network === 'string' ? routeParams.network : null;

  // Reflect the selection in the URL so copying the address bar shares the
  // window the sharer was looking at, and the card renders it. Re-runs on
  // navigation because client-side transitions drop query params.
  // replaceState keeps Next's router state intact.
  useEffect(() => {
    if (!pathUsesTimeRange(pathname, networkSegment)) return;

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
  }, [timeRange, pathname, networkSegment]);

  const value = useMemo(() => ({ timeRange, setTimeRange }), [timeRange]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange() {
  return useContext(TimeRangeContext);
}
