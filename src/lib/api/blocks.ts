import { Block, LatestBlocksResponse, ApiResponse, BlobResponse } from '../../types';
import { fetchApi, formatRelativeTime } from './core';

/**
 * Get latest confirmed blobs and group them by block
 * @param limit - Number of blobs to fetch
 * @param network - Optional network parameter
 */
export async function getLatestBlocks(limit = 20, network?: string): Promise<LatestBlocksResponse> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/latest?limit=${limit}`, network);

    // Group blobs by block number
    const blockMap = new Map<string, { blobs: BlobResponse[]; firstSeen: string }>();
    for (const blob of response.data) {
        const blockNum = blob.block_number.toString();
        if (!blockMap.has(blockNum)) {
            blockMap.set(blockNum, { blobs: [], firstSeen: blob.timestamp });
        }
        blockMap.get(blockNum)!.blobs.push(blob);
    }

    // Convert to Block[] for display
    const blocks: Block[] = Array.from(blockMap.entries()).map(([blockNum, { blobs, firstSeen }], index) => {
        const attributions: string[] = Array.from(new Set(
            blobs
                .map(b => b.user_attribution)
                .filter((attr): attr is string => Boolean(attr))
        ));

        return {
            id: index + 1,
            number: blockNum,
            blobCount: blobs.length,
            timestamp: formatRelativeTime(firstSeen),
            attribution: attributions.length > 0 ? attributions : ['Unknown']
        };
    });

    return { data: blocks };
}

/**
 * Get specific blob transaction by hash
 * @param txHash - Transaction hash to retrieve
 * @param network - Optional network parameter
 */
export async function getBlobByTxHash(txHash: string, network?: string): Promise<ApiResponse<BlobResponse>> {
    return fetchApi<ApiResponse<BlobResponse>>(`/blob/${txHash}`, network);
}
