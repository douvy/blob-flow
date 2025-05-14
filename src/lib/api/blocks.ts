import { Block, LatestBlocksResponse } from '../../types';
import { fetchApi, formatRelativeTime } from './core';

/**
 * Get latest blocks with pagination
 * @param page - Page number (starts at 1)
 * @param limit - Number of items per page
 */
export async function getLatestBlocks(page = 1, limit = 10): Promise<LatestBlocksResponse> {
    // Convert page-based pagination to cursor-based pagination
    // For the first page, we don't need a cursor
    const cursor = page > 1 ? `page_${page}` : '';

    const response = await fetchApi<any>(`/blob/latest?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);

    // Map the API response to our expected format
    const blocks: Block[] = response.data.map((blob: any, index: number) => {
        // Group blobs by block number
        const blockNumber = blob.block_number.toString();

        // Count blobs in this block
        const blobCount = response.data.filter((b: any) => b.block_number.toString() === blockNumber).length;

        // Get unique attributions for this block
        const attributions: string[] = Array.from(new Set(
            response.data
                .filter((b: any) => b.block_number.toString() === blockNumber)
                .map((b: any) => b.user_attribution as string)
                .filter(Boolean)
        ));

        return {
            id: index + 1,
            number: blockNumber,
            blobCount,
            timestamp: formatRelativeTime(blob.timestamp),
            attribution: attributions.length > 0 ? attributions : ['Unknown']
        };
    });

    // Remove duplicate blocks (since we're getting blob-level data)
    const uniqueBlocks = blocks.filter((block, index, self) =>
        index === self.findIndex((b) => b.number === block.number)
    );

    return {
        data: uniqueBlocks,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(response.pagination.total_items / limit),
            totalItems: response.pagination.total_items,
            itemsPerPage: limit
        }
    };
}

/**
 * Get specific block by number
 * @param blockNumber - Block number to retrieve
 */
export async function getBlockByNumber(blockNumber: string): Promise<{ data: Block }> {
    // We need to query all blobs for this block number
    const response = await fetchApi<any>(`/blob/latest?limit=100`);

    // Filter blobs for this block
    const blockBlobs = response.data.filter((blob: any) =>
        blob.block_number.toString() === blockNumber
    );

    if (blockBlobs.length === 0) {
        throw new Error(`Block ${blockNumber} not found`);
    }

    // Get unique attributions for this block
    const attributions: string[] = Array.from(new Set(
        blockBlobs
            .map((blob: any) => blob.user_attribution as string)
            .filter(Boolean)
    ));

    const block: Block = {
        id: 1,
        number: blockNumber,
        blobCount: blockBlobs.length,
        timestamp: formatRelativeTime(blockBlobs[0].timestamp),
        attribution: attributions.length > 0 ? attributions : ['Unknown']
    };

    return { data: block };
}

/**
 * Get specific blob transaction by hash
 * @param txHash - Transaction hash to retrieve
 */
export async function getBlobByTxHash(txHash: string): Promise<any> {
    return fetchApi<any>(`/blob/${txHash}`);
}
