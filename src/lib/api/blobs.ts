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
 * dry. The page budget is twice the minimum needed, so overlap between pages
 * (see below) does not cut the result short; paging also stops early once a
 * page contributes nothing new, which is the only way a full page can fail to
 * make progress.
 */
export async function getRawBlobs(
  limit = 200,
  network?: string
): Promise<BlobResponse[]> {
  const blobs: BlobResponse[] = [];
  const seenBlobKeys = new Set<string>();
  const maxPages = Math.ceil(limit / BLOB_FEED_PAGE_SIZE) * 2;

  for (let page = 0; page < maxPages && blobs.length < limit; page++) {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(
      `/blob/latest?limit=${BLOB_FEED_PAGE_SIZE}&offset=${page * BLOB_FEED_PAGE_SIZE}`,
      network
    );
    const rows = response.data;

    // Blobs arriving between page requests shift older rows to higher
    // offsets, so consecutive pages can overlap; keep each blob once.
    let addedFromPage = 0;
    for (const blob of rows) {
      const key = `${blob.tx_hash}:${blob.blob_index}`;
      if (seenBlobKeys.has(key)) continue;
      seenBlobKeys.add(key);
      blobs.push(blob);
      addedFromPage++;
    }

    if (rows.length < BLOB_FEED_PAGE_SIZE) break;
    if (addedFromPage === 0) break;
  }

  return blobs.slice(0, limit);
}
