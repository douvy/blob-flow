/**
 * Server-side proxy to a BlobArchive (bloar) follower's beacon blobs
 * endpoint: GET {BLOB_ARCHIVE_URL}/eth/v1/beacon/blobs/{slot}.
 *
 * Browsers cannot reach an operator's follower directly (loopback listener,
 * private network access rules), so this route relays the request from the
 * deployment's own network. The follower's blobs route is public and needs
 * no auth; BLOB_ARCHIVE_TOKEN is supported for deployments that front the
 * follower with an authenticating proxy.
 *
 * Query params:
 *   slot            beacon slot number (required)
 *   versioned_hash  0x01-prefixed EIP-4844 versioned hash (required)
 *   network         indexer network name; must match BLOB_ARCHIVE_NETWORK
 *   download        "1" to add a Content-Disposition attachment header
 *
 * GET responds with the single blob's raw 131072 bytes on success; error
 * bodies are JSON: { success: false, error: string }. HEAD is an availability
 * probe returning the same status codes with no body.
 */

const UPSTREAM_TIMEOUT_MS = 10000;
const BLOB_BYTE_LENGTH = 131072;
const SLOT_PATTERN = /^\d{1,12}$/;
const VERSIONED_HASH_PATTERN = /^0x01[0-9a-f]{62}$/i;

/**
 * Only these query parameters are meaningful; anything else is rejected so
 * the URL space stays canonical (one blob, one cacheable URL) instead of
 * being an open cache-busting surface.
 */
const ALLOWED_PARAMS = new Set(['slot', 'versioned_hash', 'network', 'download']);

function jsonError(status: number, error: string, headers?: Record<string, string>): Response {
  return Response.json({ success: false, error }, { status, headers });
}

export async function GET(request: Request): Promise<Response> {
  return proxyRawBlob(request, true);
}

export async function HEAD(request: Request): Promise<Response> {
  return proxyRawBlob(request, false);
}

async function proxyRawBlob(request: Request, relayBody: boolean): Promise<Response> {
  // HEAD responses carry no body, so errors surface as bare status codes.
  const fail = (status: number, error: string, headers?: Record<string, string>): Response =>
    relayBody ? jsonError(status, error, headers) : new Response(null, { status, headers });

  const archiveUrl = (process.env.BLOB_ARCHIVE_URL || '').replace(/\/+$/, '');
  const archiveNetwork = (process.env.BLOB_ARCHIVE_NETWORK || 'mainnet').toLowerCase();

  if (!archiveUrl) {
    return fail(501, 'Raw blob viewing is not configured on this deployment.');
  }

  const { searchParams } = new URL(request.url);
  for (const key of searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return fail(400, `Unexpected query parameter "${key}".`);
    }
  }

  const slot = searchParams.get('slot') || '';
  const versionedHash = (searchParams.get('versioned_hash') || '').toLowerCase();
  const network = (searchParams.get('network') || archiveNetwork).toLowerCase();

  if (!SLOT_PATTERN.test(slot)) {
    return fail(400, 'Invalid or missing slot parameter.');
  }
  if (!VERSIONED_HASH_PATTERN.test(versionedHash)) {
    return fail(400, 'Invalid or missing versioned_hash parameter.');
  }
  if (network !== archiveNetwork) {
    return fail(501, `The blob archive is not configured for network "${network}".`);
  }

  // Canonical decimal form, so "0123" cannot address the same blob under a
  // second upstream URL.
  const canonicalSlot = String(Number(slot));

  const upstreamUrl = `${archiveUrl}/eth/v1/beacon/blobs/${canonicalSlot}?versioned_hashes=${versionedHash}`;
  const headers: Record<string, string> = { Accept: 'application/octet-stream' };
  if (process.env.BLOB_ARCHIVE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.BLOB_ARCHIVE_TOKEN}`;
  }

  // The timeout must cover the body read, not just the response headers, and
  // a client that goes away should cancel the upstream fetch with it.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const abortUpstream = () => controller.abort();
  request.signal.addEventListener('abort', abortUpstream);

  try {
    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, { headers, signal: controller.signal });
    } catch {
      return fail(502, 'Could not reach the blob archive.');
    }

    if (upstream.status === 404) {
      upstream.body?.cancel();
      return fail(
        404,
        'Blob not found in the archive. The slot may predate the archive or the hash is absent.'
      );
    }
    if (upstream.status === 503) {
      upstream.body?.cancel();
      return fail(503, 'The archive has not synced this slot yet. Try again shortly.', {
        'Retry-After': upstream.headers.get('Retry-After') || '12',
      });
    }
    if (!upstream.ok) {
      upstream.body?.cancel();
      return fail(502, `Unexpected archive response (${upstream.status}).`);
    }

    if (!relayBody) {
      // Availability probe: the archive answered; drop the payload unread.
      upstream.body?.cancel();
      return new Response(null, { status: 200 });
    }

    // Refuse declared-oversize responses before buffering anything.
    const contentLength = upstream.headers.get('Content-Length');
    if (contentLength !== null && Number(contentLength) !== BLOB_BYTE_LENGTH) {
      upstream.body?.cancel();
      return fail(502, 'Archive returned an unexpected payload size.');
    }

    let body: ArrayBuffer;
    try {
      body = await upstream.arrayBuffer();
    } catch {
      return fail(502, 'Could not read the blob from the archive.');
    }
    if (body.byteLength !== BLOB_BYTE_LENGTH) {
      return fail(502, 'Archive returned an unexpected payload size.');
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      // Content is addressed by versioned hash, so a hit never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
    if (searchParams.get('download') === '1') {
      responseHeaders['Content-Disposition'] = `attachment; filename="blob-${versionedHash}.bin"`;
    }

    return new Response(body, { status: 200, headers: responseHeaders });
  } finally {
    clearTimeout(timeoutId);
    request.signal.removeEventListener('abort', abortUpstream);
  }
}
