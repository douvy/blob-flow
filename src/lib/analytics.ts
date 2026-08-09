/**
 * Client-side interface to a self-hosted Umami instance.
 *
 * Pageviews are collected automatically by the tracker script (it hooks
 * history.pushState and replaceState, so App Router navigations are counted
 * without any per-page wiring). This module covers the rest: the paths the
 * script and its collection endpoint are served from, and a typed wrapper
 * around the tracker's custom-event API.
 *
 * Every export is safe to call when analytics is not configured, when the
 * script failed to load, and when the visitor's browser blocked it: the
 * tracker only exists on window once it has initialized, so trackEvent is a
 * no-op until then. Nothing here throws, since a UI handler must never break
 * because a beacon could not be sent.
 */

/**
 * The tracker script and its collection endpoint are served from this app's
 * own origin, proxied by src/app/api/stats/[...path]/route.ts. Filter lists
 * target third-party analytics hostnames and well-known script names, so a
 * first-party path keeps the script loading for most visitors; it also keeps
 * the browser from opening a second connection just to report a pageview.
 */
export const ANALYTICS_PROXY_PATH = '/api/stats';

/** Where the tracker script is fetched from. */
export const ANALYTICS_SCRIPT_PATH = `${ANALYTICS_PROXY_PATH}/script.js`;

/**
 * Value for the tracker's data-host-url. The tracker appends its collection
 * path to this string verbatim, so a root-relative value resolves against
 * whatever origin is serving the page: the same build then reports correctly
 * from production, a preview deployment, and localhost, with no CORS
 * preflight and no origin baked into the bundle.
 */
export const ANALYTICS_HOST_URL = ANALYTICS_PROXY_PATH;

/**
 * Custom events, and the properties each one carries. Umami stores event
 * properties as strings and numbers, so keep values scalar and low
 * cardinality: these become filter facets in the dashboard, not a log.
 */
interface AnalyticsEvents {
  /** A visitor changed chain from the header's network picker. */
  'network-switch': { from: string; to: string };
  /** A visitor changed the global time range. */
  'time-range-change': { range: string; previous: string };
  /** A chart's share action produced an image, or failed to. */
  'chart-image': { chart: string; outcome: 'copied' | 'downloaded' | 'error' };
  /** A visitor opened the X intent for a chart. */
  'chart-share-x': { chart: string; network: string; range: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

type UmamiTracker = {
  track: (name: string, data?: Record<string, unknown>) => void;
};

/** The subset of the tracker's payload this module reads. */
interface TrackerPayload {
  url?: string;
  /** Absent on a pageview, present on a custom event. */
  name?: string;
}

/**
 * Name of the global the tracker calls before every beacon, passed to it as
 * data-before-send. Typed as the literal so it cannot drift from the Window
 * property declared below.
 */
export const ANALYTICS_BEFORE_SEND = 'blobflowBeforeSend' as const;

declare global {
  interface Window {
    umami?: UmamiTracker;
    blobflowBeforeSend?: (
      type: string,
      payload: TrackerPayload
    ) => TrackerPayload | undefined;
  }
}

/**
 * The last pageview URL that was reported, with the time range dropped. Module
 * state because the tracker gives the hook no context of its own.
 */
let lastPageviewKey: string | null = null;

/** Path and query of a pageview URL, minus the time range. */
function pageviewKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('range');
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/**
 * Drops the pageview that changing the time range would otherwise produce.
 *
 * The selected range lives in the query string so a view can be linked, which
 * means every toggle rewrites the URL, and the tracker reports a pageview on
 * any URL change. Left alone, the app's most common interaction would inflate
 * pageviews and views-per-visit on exactly the pages that get used most. The
 * range is still recorded, as a time-range-change event with both sides of the
 * switch, which is the more useful shape anyway.
 *
 * Only that one case is suppressed: custom events, real navigations, and every
 * other query parameter (campaign tags included, which Umami reads off the
 * URL) pass through untouched.
 *
 * Returning undefined cancels the beacon.
 */
export function beforeSend(
  type: string,
  payload: TrackerPayload
): TrackerPayload | undefined {
  if (type !== 'event' || payload?.name || typeof payload?.url !== 'string') {
    return payload;
  }

  const key = pageviewKey(payload.url);
  if (key === null) return payload;
  if (key === lastPageviewKey) return undefined;

  lastPageviewKey = key;
  return payload;
}

/** Test seam: the hook's memory of the last page reported. */
export function resetPageviewState(): void {
  lastPageviewKey = null;
}

/**
 * Report a custom event. Silently does nothing when no tracker is present,
 * which is every case other than a configured deployment whose visitor did
 * not block the script.
 */
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  data: AnalyticsEvents[K]
): void {
  if (typeof window === 'undefined') return;
  const tracker = window.umami;
  if (!tracker || typeof tracker.track !== 'function') return;

  try {
    tracker.track(name, data);
  } catch {
    // A failed beacon is not worth surfacing, and must not interrupt the
    // interaction that triggered it.
  }
}

/**
 * Hostname to pass as the tracker's data-domains, or undefined to leave the
 * attribute off. Restricting collection to the canonical host keeps local
 * development and preview deployments from reporting into production stats
 * if they are ever built with a website id.
 */
export function trackedDomain(siteUrl: string): string | undefined {
  let hostname: string;
  try {
    hostname = new URL(siteUrl).hostname;
  } catch {
    return undefined;
  }

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }
  return hostname;
}
