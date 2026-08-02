/**
 * Client for the same-origin raw blob proxy route (/api/raw-blob), which
 * relays requests to a BlobArchive (bloar) follower's beacon blobs endpoint.
 *
 * Deliberately not routed through fetchApi: the proxy is same-origin rather
 * than API_BASE_URL, and it returns raw blob bytes instead of a JSON
 * ApiResponse envelope.
 */

export const RAW_BLOB_TIMEOUT_MS = 15000;

/** EIP-4844 blobs are always exactly 128 KiB on the wire. */
export const BLOB_BYTE_LENGTH = 131072;

/**
 * Failure fetching a raw blob, carrying the HTTP status so callers can
 * distinguish "not archived" (404) and "still syncing" (503) from transport
 * errors (status 0).
 */
export class RawBlobError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RawBlobError';
    this.status = status;
  }
}

/**
 * Fetch the raw bytes of a single blob by beacon slot and versioned hash.
 */
export async function fetchRawBlob(
  slot: number,
  versionedHash: string,
  network: string
): Promise<Uint8Array> {
  const params = new URLSearchParams({
    slot: String(slot),
    versioned_hash: versionedHash,
    network,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RAW_BLOB_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/raw-blob?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new RawBlobError(response.status, await readErrorMessage(response));
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error: unknown) {
    if (error instanceof RawBlobError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RawBlobError(0, 'Raw blob request timed out.');
    }
    throw new RawBlobError(0, 'Raw blob request failed.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export type RawBlobAvailability = 'available' | 'pending' | 'missing' | 'error';

/**
 * Probe whether a blob's bytes are retrievable right now, without
 * downloading them. 'pending' means the archive has not synced the slot yet;
 * 'missing' means it is definitively absent.
 */
export async function checkRawBlobAvailability(
  slot: number,
  versionedHash: string,
  network: string
): Promise<RawBlobAvailability> {
  const params = new URLSearchParams({
    slot: String(slot),
    versioned_hash: versionedHash,
    network,
  });

  try {
    const response = await fetch(`/api/raw-blob?${params.toString()}`, { method: 'HEAD' });
    if (response.ok) return 'available';
    if (response.status === 503) return 'pending';
    if (response.status === 404) return 'missing';
    return 'error';
  } catch {
    return 'error';
  }
}

/**
 * Direct download URL for a blob's raw bytes; the download flag makes the
 * proxy attach a Content-Disposition filename.
 */
export function rawBlobDownloadUrl(slot: number, versionedHash: string, network: string): string {
  const params = new URLSearchParams({
    slot: String(slot),
    versioned_hash: versionedHash,
    network,
    download: '1',
  });
  return `/api/raw-blob?${params.toString()}`;
}

export interface RawBlobStatus {
  enabled: boolean;
  network: string;
}

/**
 * Whether this deployment can serve raw blobs, and for which network.
 * Failures throw rather than reading as disabled, so callers (react-query)
 * can retry instead of caching a transient outage as "feature off".
 */
export async function fetchRawBlobStatus(): Promise<RawBlobStatus> {
  const response = await fetch('/api/raw-blob/status');
  if (!response.ok) {
    throw new RawBlobError(response.status, `Raw blob status request failed (${response.status}).`);
  }
  const body = await response.json();
  const data = body?.data;
  if (!data || typeof data.enabled !== 'boolean' || typeof data.network !== 'string') {
    throw new RawBlobError(0, 'Raw blob status response was malformed.');
  }
  return { enabled: data.enabled, network: data.network };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.error === 'string' && body.error) {
      return body.error;
    }
  } catch {
    // Non-JSON error body; fall through to the generic message.
  }
  return `Raw blob request failed (${response.status}).`;
}
