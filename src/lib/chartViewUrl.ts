import { useSyncExternalStore } from 'react';
import type { TimeRange } from '@/contexts/TimeRangeContext';

// Query param that makes the chart time range shareable, e.g.
// /charts/base-fee?range=7d. The network is a route segment rather than a
// param (see networkPath in src/utils), so a link states both.
export const CHART_RANGE_PARAM = 'range';

// Every range the chart UI can actually display. The backend additionally
// accepts 'all' (BackendChartRange), but the blob-market endpoint rejects it
// with a 400, so the chart layer never requests it; see parseChartRangeParam.
const CHART_URL_RANGES: readonly TimeRange[] = ['1h', '24h', '7d', '30d'];

/**
 * Parse a ?range= query param into a chart time range.
 *
 * Accepts the BackendChartRange values. 'all' is valid for the backend but the
 * blob-market chart endpoint rejects it, so it is capped to the widest range
 * the charts support instead of being treated as invalid. Anything else
 * returns null so callers fall back silently to the default value.
 */
export function parseChartRangeParam(value: string | null | undefined): TimeRange | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const match = CHART_URL_RANGES.find((range) => range === normalized);
  if (match) return match;
  if (normalized === 'all') return '30d';
  return null;
}

/**
 * Routes whose view is driven by the chart range selection. Paths arrive here
 * already stripped of any network segment (see stripNetworkPath).
 */
export function isChartViewPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname.startsWith('/charts/');
}

export interface ChartViewParams {
  range: TimeRange | null;
}

const EMPTY_CHART_VIEW_PARAMS: ChartViewParams = { range: null };

// Frozen snapshot of the URL params, cached with the search string it was
// parsed from. The stable object identity matters twice over: it keeps
// useSyncExternalStore from re-rendering forever, and it guarantees every
// subscriber reads the same value at any instant. The cache only refreshes
// through invalidateIfSearchChanged, which notifies all subscribers together,
// so components that happen to re-render at different times can never split
// between old and new params.
let chartViewParamsCache: { search: string; params: ChartViewParams } | null = null;

const chartViewParamsListeners = new Set<() => void>();

function getChartViewParamsSnapshot(): ChartViewParams {
  if (!chartViewParamsCache) {
    const search = window.location.search;
    chartViewParamsCache = {
      search,
      params: {
        range: parseChartRangeParam(new URLSearchParams(search).get(CHART_RANGE_PARAM)),
      },
    };
  }
  return chartViewParamsCache.params;
}

function invalidateIfSearchChanged(): void {
  if (chartViewParamsCache && chartViewParamsCache.search !== window.location.search) {
    chartViewParamsCache = null;
    // Copy first: notified components can resubscribe during the loop.
    [...chartViewParamsListeners].forEach((listener) => listener());
  }
}

function handlePopstate(): void {
  invalidateIfSearchChanged();
}

/**
 * Test-only: drops the frozen snapshot so each test parses its own URL. In
 * the app the module (and so the cache) lives exactly one full page load.
 */
export function resetChartViewParamsForTests(): void {
  chartViewParamsCache = null;
}

function subscribeChartViewParams(listener: () => void): () => void {
  if (chartViewParamsListeners.size === 0) {
    window.addEventListener('popstate', handlePopstate);
  }
  chartViewParamsListeners.add(listener);
  // A component mounting after a client-side navigation sees the navigated
  // URL while the cache still holds the previous one; refresh here so every
  // subscriber picks the change up in the same pass.
  invalidateIfSearchChanged();
  return () => {
    chartViewParamsListeners.delete(listener);
    if (chartViewParamsListeners.size === 0) {
      window.removeEventListener('popstate', handlePopstate);
    }
  };
}

/**
 * Chart view params from the URL. The server snapshot is empty so prerendered
 * HTML matches hydration, and the real values apply in the re-render React
 * runs right after hydration; a direct window.location read in a state
 * initializer would instead cause an attribute hydration mismatch, which
 * React 19 does not patch up.
 *
 * The store refreshes on history traversal (popstate) and when a subscriber
 * mounts after a navigation changed the search string. Programmatic rewrites
 * of the current entry (the router.replace issued when the user changes the
 * range) carry values identical to the in-memory state, so not observing them
 * immediately is harmless.
 */
export function useChartViewUrlParams(): ChartViewParams {
  return useSyncExternalStore(
    subscribeChartViewParams,
    getChartViewParamsSnapshot,
    () => EMPTY_CHART_VIEW_PARAMS
  );
}

/**
 * Build the URL reflecting the current chart view, preserving unrelated query
 * params and the hash fragment.
 */
export function buildChartViewUrl(
  pathname: string,
  currentSearch: string,
  range: TimeRange,
  hash = ''
): string {
  const params = new URLSearchParams(currentSearch);
  params.set(CHART_RANGE_PARAM, range);
  return `${pathname}?${params.toString()}${hash}`;
}

/**
 * Internal href carrying the resolved range, so navigation between the
 * dashboard and chart pages keeps the selected view and a copied link
 * reproduces it exactly. Built from state rather than the current URL, which
 * may carry no param at all or a value the app fell back from. Hash fragments
 * in the href are preserved.
 */
export function buildChartViewHref(href: string, range: TimeRange): string {
  const hashIndex = href.indexOf('#');
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const queryIndex = base.indexOf('?');
  const path = queryIndex === -1 ? base : base.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : base.slice(queryIndex + 1));
  params.set(CHART_RANGE_PARAM, range);
  return `${path}?${params.toString()}${hash}`;
}
