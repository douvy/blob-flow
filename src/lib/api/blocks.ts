import { Block, LatestBlocksResponse, ApiResponse, BlobResponse, NewBlockData } from '../../types';
import { fetchApi, formatRelativeTime } from './core';

export function transformNewBlockData(blockData: NewBlockData): Block {
    const attributions: string[] = Array.from(new Set(
        blockData.blobs
            .map(blob => blob.user_attribution)
            .filter((attr): attr is string => Boolean(attr))
    ));

    return {
        id: blockData.block_number,
        number: blockData.block_number.toString(),
        blobCount: blockData.blob_count,
        timestamp: formatRelativeTime(blockData.timestamp),
        attribution: attributions.length > 0 ? attributions : ['Unknown']
    };
}

export function transformBlobResponsesToBlocks(blobsResponse: BlobResponse[]): LatestBlocksResponse {
    // Group blobs by block number
    const blockMap = new Map<string, { blobs: BlobResponse[]; firstSeen: string }>();
    for (const blob of blobsResponse) {
        const blockNum = blob.block_number.toString();
        if (!blockMap.has(blockNum)) {
            blockMap.set(blockNum, { blobs: [], firstSeen: blob.timestamp });
        }
        blockMap.get(blockNum)!.blobs.push(blob);
    }

    // Convert to Block[] for display
    const blocks: Block[] = Array.from(blockMap.entries()).map(([blockNum, { blobs, firstSeen }]) => {
        return transformNewBlockData({
            block_number: Number(blockNum),
            blob_count: blobs.length,
            timestamp: firstSeen,
            blobs
        });
    });

    return { data: blocks };
}

/**
 * Get latest confirmed blobs and group them by block
 * @param limit - Number of blobs to fetch
 * @param network - Optional network parameter
 */
export async function getLatestBlocks(limit = 20, network?: string): Promise<LatestBlocksResponse> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/latest?limit=${limit}`, network);

    return transformBlobResponsesToBlocks(response.data);
}

/**
 * Get specific blob transaction by hash
 * @param txHash - Transaction hash to retrieve
 * @param network - Optional network parameter
 */
export async function getBlobByTxHash(txHash: string, network?: string): Promise<ApiResponse<BlobResponse>> {
    return fetchApi<ApiResponse<BlobResponse>>(`/blob/${txHash}`, network);
}
