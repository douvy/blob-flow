import type { TimeRange } from '@/constants';

/**
 * Query param carrying the selected time range, e.g.
 * /charts/base-fee?range=7d. Reading it is handled by
 * useDeepLinkedTimeRange and by the share card metadata; the helpers here
 * cover the writing side, so the address bar and in-app links always state
 * the range being viewed.
 */
export const CHART_RANGE_PARAM = 'range';

/** Routes whose view is driven by the selected time range. */
export function isChartViewPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname.startsWith('/charts/');
}

/**
 * The current URL with the range param set, preserving unrelated query params
 * and the hash fragment. Used to rewrite the address bar when the range
 * changes, so copying the URL reproduces the view on screen.
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
 * An internal href carrying the selected range, so navigating between the
 * dashboard and chart pages keeps the view. Built from state rather than the
 * current URL, which may carry no param at all (the range was picked before
 * any rewrite) or a value the app fell back from. Hash fragments in the href
 * are preserved.
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
