import { MempoolResponse, MempoolTransaction } from '../../types';
import { fetchApi, formatRelativeTime, truncateAddress } from './core';

/**
 * Get mempool data (pending transactions) with pagination
 * @param page - Page number (starts at 1)
 * @param limit - Number of items per page
 */
export async function getMempool(page = 1, limit = 5): Promise<MempoolResponse> {
    // Convert page-based pagination to cursor-based pagination
    const cursor = page > 1 ? `page_${page}` : '';

    const response = await fetchApi<any>(`/blob/mempool?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);

    // Map the API response to our expected format
    const transactions: MempoolTransaction[] = response.data.map((blob: any, index: number) => {
        return {
            id: index + 1,
            txHash: blob.tx_hash,
            fromAddress: truncateAddress(blob.from_address),
            user: blob.user_attribution || null,
            blobCount: 1, // Each blob is a separate entry in the API
            estimatedCost: blob.total_cost_eth + ' ETH',
            timeInMempool: formatRelativeTime(blob.timestamp)
        };
    });

    return {
        data: transactions,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(response.pagination.total_items / limit),
            totalItems: response.pagination.total_items,
            itemsPerPage: limit
        }
    };
}
