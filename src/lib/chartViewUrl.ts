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

// Cache keyed by the raw search string so the snapshot keeps a stable object
// identity between renders; useSyncExternalStore would re-render forever if
// every call returned a fresh object.
let chartViewParamsCache: { search: string; params: ChartViewParams } | null = null;

const subscribeNever = () => () => {};

function getChartViewParamsSnapshot(): ChartViewParams {
  const search = window.location.search;
  if (!chartViewParamsCache || chartViewParamsCache.search !== search) {
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

/**
 * Chart view params from the URL. The server snapshot is empty so prerendered
 * HTML matches hydration, and the real values apply in the re-render React
 * runs right after hydration; a direct window.location read in a state
 * initializer would instead cause an attribute hydration mismatch, which
 * React 19 does not patch up.
 */
export function useChartViewUrlParams(): ChartViewParams {
  return useSyncExternalStore(
    subscribeNever,
    getChartViewParamsSnapshot,
    () => EMPTY_CHART_VIEW_PARAMS
  );
}

/**
 * Build the URL reflecting the current chart view, preserving unrelated query
 * params. Both params are written together so a copied link reproduces the
 * exact view, not just the last setting the user touched.
 */
export function buildChartViewUrl(
  pathname: string,
  currentSearch: string,
  view: { range: TimeRange; network: string }
): string {
  const params = new URLSearchParams(currentSearch);
  params.set(CHART_RANGE_PARAM, view.range);
  params.set(CHART_NETWORK_PARAM, view.network);
  return `${pathname}?${params.toString()}`;
}

/**
 * URL to load after a network change. The app fully reloads on network switch,
 * so on chart views the param is written into the reload target both to keep
 * the address shareable and so a stale ?network= param cannot override the new
 * selection when the page comes back. Returns null when the URL needs no
 * change and a plain reload suffices.
 */
export function buildNetworkChangeUrl(
  location: { pathname: string; search: string; hash: string },
  apiParam: string
): string | null {
  const params = new URLSearchParams(location.search);
  if (!isChartViewPath(location.pathname) && !params.has(CHART_NETWORK_PARAM)) {
    return null;
  }
  params.set(CHART_NETWORK_PARAM, apiParam);
  return `${location.pathname}?${params.toString()}${location.hash}`;
}

/**
 * Carry the chart view params from the current URL onto an internal href, so
 * navigation between the dashboard and chart pages keeps the selected view.
 * Invalid params are dropped rather than propagated; 'all' normalizes to the
 * capped range actually shown. Hash fragments in the href are preserved.
 */
export function appendChartViewParams(href: string, currentSearch: string): string {
  const current = new URLSearchParams(currentSearch);
  const carried = new URLSearchParams();

  const range = parseChartRangeParam(current.get(CHART_RANGE_PARAM));
  if (range) carried.set(CHART_RANGE_PARAM, range);
  const network = parseChartNetworkParam(current.get(CHART_NETWORK_PARAM));
  if (network) carried.set(CHART_NETWORK_PARAM, network);

  const query = carried.toString();
  if (!query) return href;

  const hashIndex = href.indexOf('#');
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${query}${hash}`;
}
