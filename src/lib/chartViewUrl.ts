import { useSyncExternalStore } from 'react';
import type { TimeRange } from '@/contexts/TimeRangeContext';

// Query params that make chart view state shareable, e.g.
// /charts/base-fee?range=7d&network=mainnet.
export const CHART_RANGE_PARAM = 'range';
export const CHART_NETWORK_PARAM = 'network';

// Every range the chart UI can actually display. The backend additionally
// accepts 'all' (BackendChartRange), but the blob-market endpoint rejects it
// with a 400, so the chart layer never requests it; see parseChartRangeParam.
const CHART_URL_RANGES: readonly TimeRange[] = ['1h', '24h', '7d', '30d'];

// Backend network names are lowercase slug identifiers (e.g. "mainnet",
// "op-sepolia"). The list itself is dynamic, so the URL param is validated by
// shape only; unknown-but-well-formed values resolve downstream in useNetwork.
const NETWORK_PARAM_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Parse a ?range= query param into a chart time range.
 *
 * Accepts the BackendChartRange values. 'all' is valid for the backend but the
 * blob-market chart endpoint rejects it, so it is capped to the widest range
 * the charts support instead of being treated as invalid. Anything else
 * returns null so callers fall back silently to the stored/default value.
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
 * Parse a ?network= query param into a backend network identifier.
 * Returns null for malformed values so callers fall back silently.
 */
export function parseChartNetworkParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return NETWORK_PARAM_PATTERN.test(normalized) ? normalized : null;
}

/** Routes whose view is driven by the chart range/network selection. */
export function isChartViewPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname.startsWith('/charts/');
}

export interface ChartViewParams {
  range: TimeRange | null;
  network: string | null;
}

const EMPTY_CHART_VIEW_PARAMS: ChartViewParams = { range: null, network: null };

// Frozen snapshot of the URL params, cached with the search string it was
// parsed from. The stable object identity matters twice over: it keeps
// useSyncExternalStore from re-rendering forever, and it guarantees every
// subscriber reads the same values at any instant. The cache only refreshes
// through invalidateIfSearchChanged, which notifies all subscribers together,
// so components that happen to re-render at different times can never split
// between old and new params (e.g. one network for the WebSocket and another
// for chart fetches).
let chartViewParamsCache: { search: string; params: ChartViewParams } | null = null;

const chartViewParamsListeners = new Set<() => void>();

function getChartViewParamsSnapshot(): ChartViewParams {
  if (!chartViewParamsCache) {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    chartViewParamsCache = {
      search,
      params: {
        range: parseChartRangeParam(params.get(CHART_RANGE_PARAM)),
        network: parseChartNetworkParam(params.get(CHART_NETWORK_PARAM)),
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
 * params and the hash fragment. Both params are written together so a copied
 * link reproduces the exact view, not just the last setting the user touched.
 */
export function buildChartViewUrl(
  pathname: string,
  currentSearch: string,
  view: { range: TimeRange; network: string },
  hash = ''
): string {
  const params = new URLSearchParams(currentSearch);
  params.set(CHART_RANGE_PARAM, view.range);
  params.set(CHART_NETWORK_PARAM, view.network);
  return `${pathname}?${params.toString()}${hash}`;
}

/**
 * URL to load after a network change. The app fully reloads on network switch,
 * so on chart views both view params are written into the reload target: the
 * address stays shareable, a stale ?network= param cannot override the new
 * selection when the page comes back, and the selected range survives the
 * reload. The range comes from the in-memory state rather than the current
 * search string, which may still predate an uncommitted router.replace.
 * Returns null when the URL needs no change and a plain reload suffices.
 */
export function buildNetworkChangeUrl(
  location: { pathname: string; search: string; hash: string },
  view: { range: TimeRange; network: string }
): string | null {
  const params = new URLSearchParams(location.search);
  const onChartView = isChartViewPath(location.pathname);
  const writeNetwork = onChartView || params.has(CHART_NETWORK_PARAM);
  const writeRange = onChartView || params.has(CHART_RANGE_PARAM);
  if (!writeNetwork && !writeRange) return null;
  if (writeRange) params.set(CHART_RANGE_PARAM, view.range);
  if (writeNetwork) params.set(CHART_NETWORK_PARAM, view.network);
  return `${location.pathname}?${params.toString()}${location.hash}`;
}

/**
 * Internal href carrying the resolved chart view, so navigation between the
 * dashboard and chart pages keeps the selected view and a copied link
 * reproduces it exactly. Built from state rather than the current URL: the
 * URL may lack params (selection came from localStorage) or carry values the
 * app fell back from. Hash fragments in the href are preserved.
 */
export function buildChartViewHref(
  href: string,
  view: { range: TimeRange; network: string }
): string {
  const hashIndex = href.indexOf('#');
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const queryIndex = base.indexOf('?');
  const path = queryIndex === -1 ? base : base.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex === -1 ? '' : base.slice(queryIndex + 1));
  params.set(CHART_RANGE_PARAM, view.range);
  params.set(CHART_NETWORK_PARAM, view.network);
  return `${path}?${params.toString()}${hash}`;
}
