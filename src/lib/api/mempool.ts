import { MempoolResponse, MempoolTransaction, ApiResponse, BlobResponse } from '../../types';
import { fetchApi, formatRelativeTime, truncateAddress } from './core';
import { formatWeiToReadable } from '../../utils';

/**
 * Get mempool data (pending blob transactions)
 * @param limit - Number of blobs to fetch
 * @param network - Optional network parameter
 */
export async function getMempool(limit = 10, network?: string): Promise<MempoolResponse> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/mempool?limit=${limit}`, network);

    // Map the API response to our expected format
    const transactions: MempoolTransaction[] = response.data.map((blob: BlobResponse, index: number) => {
        return {
            id: index + 1,
            txHash: blob.tx_hash,
            fromAddress: truncateAddress(blob.from_address),
            user: blob.user_attribution || null,
            blobCount: 1,
            estimatedCost: formatWeiToReadable(blob.total_cost_eth),
            timeInMempool: formatRelativeTime(blob.timestamp)
        };
    });

    return { data: transactions };
}
