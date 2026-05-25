import { Block, LatestBlocksResponse, ApiResponse, BlobResponse, PricingResponse } from '../../types';
import { fetchApi, formatRelativeTime } from './core';

/**
 * Get latest blocks with pricing and capacity details.
 * @param limit - Number of blocks to fetch
 * @param network - Optional network parameter
 */
export async function getLatestBlocks(limit = 20, network?: string): Promise<LatestBlocksResponse> {
    const pricingResponse = await fetchApi<ApiResponse<PricingResponse>>('/blob/pricing', network);
    const blobLimit = Math.max(limit * pricingResponse.data.blob_params.max, limit);
    const latestBlobsResponse = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/latest?limit=${blobLimit}`, network);

    const blobDetailsByBlock = new Map<number, { attributions: string[]; blockUrl?: string }>();
    for (const blob of latestBlobsResponse.data) {
        if (blob.block_number < 0) continue;

        if (!blobDetailsByBlock.has(blob.block_number)) {
            blobDetailsByBlock.set(blob.block_number, { attributions: [], blockUrl: blob.block_url });
        }

        const details = blobDetailsByBlock.get(blob.block_number);
        if (!details) continue;

        if (!details.blockUrl && blob.block_url) {
            details.blockUrl = blob.block_url;
        }

        if (blob.user_attribution && !details.attributions.includes(blob.user_attribution)) {
            details.attributions.push(blob.user_attribution);
        }
    }

    const blocks: Block[] = pricingResponse.data.recent_blocks.slice(0, limit).map((block, index) => {
        const details = blobDetailsByBlock.get(block.block_number);
        return {
            id: index + 1,
            number: block.block_number.toString(),
            blockUrl: details?.blockUrl,
            blobCount: block.blob_count,
            blobGasUsed: block.blob_gas_used,
            blobGasTarget: block.blob_gas_target,
            blobGasLimit: block.blob_gas_limit,
            targetBlobs: block.target_blobs,
            maxBlobs: block.max_blobs,
            availableBlobs: block.available_blobs,
            baseFeeGwei: block.blob_base_fee_gwei,
            utilizationPercent: block.utilization_percent,
            isFull: block.is_full,
            isAboveTarget: block.is_above_target,
            timestamp: formatRelativeTime(block.block_timestamp),
            attribution: details && details.attributions.length > 0 ? details.attributions : ['Unknown']
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
