import { ApiResponse, BlobResponse, BlobTransaction } from '../../types';
import { getBlockByNumber } from './blocks';
import { fetchApi, isNotFoundError } from './core';

/**
 * Get one blob transaction with every blob it carries.
 *
 * The indexer's `/blob/{txHash}` endpoint answers with a single blob row, so
 * a multi-blob transaction only yields its sibling rows through the including
 * block. The block lookup is best effort: when it fails or the block no longer
 * lists the transaction, the single row still describes the transaction.
 *
 * Returns null when no indexed blob transaction has this hash.
 *
 * @param txHash - Transaction hash to look up
 * @param network - Optional network parameter
 */
export async function getBlobTransaction(
    txHash: string,
    network?: string,
): Promise<BlobTransaction | null> {
    let primary: BlobResponse | undefined;
    try {
        const response = await fetchApi<ApiResponse<BlobResponse>>(`/blob/${txHash}`, network);
        primary = response.data ?? undefined;
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
    if (!primary) return null;

    // Pending rows carry no block number at all.
    const blockNumber = primary.block_number;
    const confirmed = primary.confirmed && blockNumber !== null && blockNumber > 0;
    let blobs = [primary];
    let blobsComplete = false;

    if (confirmed && blockNumber !== null) {
        try {
            const block = await getBlockByNumber(blockNumber, network);
            const siblings = (block?.blobs ?? []).filter(
                (blob) => blob.tx_hash.toLowerCase() === primary.tx_hash.toLowerCase()
            );
            if (siblings.length > 0) {
                blobs = siblings;
                blobsComplete = true;
            }
        } catch {
            // Keep the single row: the block is only consulted for siblings.
        }
    }

    // Without the block's rows, the transaction's own versioned hash list is
    // the only evidence that the row in hand is the whole transaction. Rows
    // indexed before that field existed leave it unknowable, which callers
    // must surface rather than presenting one blob's figures as the total.
    if (!blobsComplete && primary.versioned_hashes?.length === blobs.length) {
        blobsComplete = true;
    }

    return {
        txHash: primary.tx_hash,
        blobs: [...blobs].sort((a, b) => a.blob_index - b.blob_index),
        primary,
        blockNumber: confirmed ? blockNumber : null,
        confirmed,
        blobsComplete,
    };
}
