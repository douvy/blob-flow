/**
 * First-party proxy to a self-hosted Umami instance, so both the tracker
 * script and the pageviews it reports travel over this app's own origin:
 *
 *   GET  /api/stats/script.js  ->  {UMAMI_URL}/script.js
 *   POST /api/stats/api/send   ->  {UMAMI_URL}/api/send
 *
 * That buys three things. Filter lists key on third-party analytics
 * hostnames, so a same-origin path is not blocked for most visitors; the
 * Umami instance needs no CORS configuration and need not be reachable from
 * the public internet at all (a private address or container hostname works);
 * and no analytics origin appears in the page, so nothing about where stats
 * are collected is disclosed.
 *
 * Only the two paths above are relayed. The upstream base comes from
 * operator-set env, but an unrestricted path would still turn this route into
 * an open proxy into whatever the deployment's network can reach, so unknown
 * paths 404 rather than being forwarded.
 *
 * Unset UMAMI_URL disables the feature: the script 404s at the source, the
 * tracker never initializes, and every trackEvent call becomes a no-op.
 */

// Env is read per request so a redeploy with new env is always reflected,
// and so a pageview beacon is never served from a cache.
export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 10000;

/** Relative to UMAMI_URL. Matched exactly against the joined route path. */
const SCRIPT_PATH = 'script.js';
const COLLECT_PATH = 'api/send';

/**
 * How long a browser may reuse the tracker script. Long enough that repeat
 * visitors do not refetch it, short enough that an Umami upgrade reaches
 * visitors the same day.
 */
const SCRIPT_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

/**
 * Request headers that must not be forwarded upstream. Everything else is
 * relayed, because the tracker carries its own x-umami-* headers (website id,
 * hostname, and the session cache token) and Umami derives the visitor's
 * browser, device, and language from user-agent and accept-language, so a
 * whitelist would silently degrade the data on any tracker update.
 *
 * cookie is dropped deliberately: the collection endpoint has no use for this
 * app's cookies, and forwarding them would hand session state to a service
 * that should only ever see anonymous pageviews. The rest are hop-by-hop or
 * are recomputed by fetch for the new request.
 */
const BLOCKED_REQUEST_HEADERS = new Set([
  'cookie',
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-connection',
]);

function upstreamBase(): string {
  return (process.env.UMAMI_URL || '').replace(/\/+$/, '');
}

function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

/**
 * Relay one request upstream with a timeout, cancelling the upstream fetch if
 * the visitor navigates away first.
 */
async function relay(
  request: Request,
  upstreamUrl: string,
  body: BodyInit | null
): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const abortUpstream = () => controller.abort();
  request.signal.addEventListener('abort', abortUpstream);

  try {
    return await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardedHeaders(request),
      body,
      signal: controller.signal,
      // Keep this hop out of Next's fetch cache: a shared response would
      // attribute every visitor's pageview to whoever warmed the cache.
      cache: 'no-store',
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
    request.signal.removeEventListener('abort', abortUpstream);
  }
}

async function resolvePath(params: Promise<{ path: string[] }>): Promise<string> {
  const { path } = await params;
  return (path || []).join('/');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const base = upstreamBase();
  const path = await resolvePath(params);

  if (!base || path !== SCRIPT_PATH) {
    return new Response(null, { status: 404 });
  }

  const upstream = await relay(request, `${base}/${SCRIPT_PATH}`, null);
  if (!upstream || !upstream.ok) {
    upstream?.body?.cancel();
    return new Response(null, { status: 502 });
  }

  const script = await upstream.text();
  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/javascript; charset=utf-8',
      'Cache-Control': SCRIPT_CACHE_CONTROL,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const base = upstreamBase();
  const path = await resolvePath(params);

  if (!base || path !== COLLECT_PATH) {
    return new Response(null, { status: 404 });
  }

  // Buffered rather than streamed: the payload is a few hundred bytes, and a
  // stream body would need duplex support that not every runtime offers.
  const body = await request.text();

  const upstream = await relay(request, `${base}/${COLLECT_PATH}`, body);
  if (!upstream) {
    // The tracker ignores the response, so an unreachable instance costs the
    // visitor nothing beyond a status code.
    return new Response(null, { status: 502 });
  }

  const payload = await upstream.text();
  return new Response(payload || null, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
