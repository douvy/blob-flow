import type { BlobResponse } from '@/types';

/**
 * Blob rows in the order they sit in their block.
 *
 * The indexer serves a block's blobs in its own order, which is not the order
 * the transactions were executed in. When every row carries a transaction
 * index the list can be put back into block order, which is how a block
 * reads everywhere else. A single row without one voids the sort: a partial
 * ordering would look authoritative while being wrong, so the API's order is
 * kept instead. The input array is never mutated.
 */
export function orderBlobsByTxIndex(blobs: BlobResponse[]): BlobResponse[] {
  if (blobs.length < 2) return blobs;
  if (!blobs.every((blob) => typeof blob.tx_index === 'number')) return blobs;

  return [...blobs].sort((a, b) => {
    const indexDelta = (a.tx_index ?? 0) - (b.tx_index ?? 0);
    // Blobs of one transaction share its index, so their own index breaks
    // the tie and a multi-blob transaction still reads 0, 1, 2.
    return indexDelta !== 0 ? indexDelta : a.blob_index - b.blob_index;
  });
}
