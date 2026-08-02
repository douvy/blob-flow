import { ApiResponse, BlobResponse } from '../../types';
import { fetchApi } from './core';

// The indexer returns at most this many rows per /blob/latest request no
// matter how large a limit is requested, so filling a larger limit means
// paging with the offset parameter.
const BLOB_FEED_PAGE_SIZE = 100;

/**
 * Fetch raw blob records for chart data aggregation.
 * Returns unprocessed BlobResponse[] for client-side bucketing.
 *
 * Pages through the feed until `limit` blobs are collected or the feed runs
 * dry. The page cap allows one extra page beyond the minimum needed, to
 * absorb rows lost to cross-page dedupe.
 */
export async function getRawBlobs(
  limit = 200,
  network?: string
): Promise<BlobResponse[]> {
  const blobs: BlobResponse[] = [];
  const seenBlobKeys = new Set<string>();
  const maxPages = Math.ceil(limit / BLOB_FEED_PAGE_SIZE) + 1;

  for (let page = 0; page < maxPages && blobs.length < limit; page++) {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(
      `/blob/latest?limit=${BLOB_FEED_PAGE_SIZE}&offset=${page * BLOB_FEED_PAGE_SIZE}`,
      network
    );
    const rows = response.data;

    // Blobs arriving between page requests shift older rows to higher
    // offsets, so consecutive pages can overlap; keep each blob once.
    for (const blob of rows) {
      const key = `${blob.tx_hash}:${blob.blob_index}`;
      if (seenBlobKeys.has(key)) continue;
      seenBlobKeys.add(key);
      blobs.push(blob);
    }

    if (rows.length < BLOB_FEED_PAGE_SIZE) break;
  }

  return blobs.slice(0, limit);
}
