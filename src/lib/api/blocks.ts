import {
    ApiResponse,
    BackendBlobPricingRecentBlock,
    BackendBlobPricingResponse,
    BlobResponse,
    Block,
    LatestBlocksResponse,
    NewBlockData,
} from '../../types';
import { fetchApi } from './core';

function getAttributions(blobs: BlobResponse[]): string[] {
    const attributions: string[] = Array.from(new Set(
        blobs
            .map(blob => blob.user_attribution)
            .filter((attr): attr is string => Boolean(attr))
    ));

    return attributions.length > 0 ? attributions : ['Unknown'];
}

function getBlockUrl(blobs: BlobResponse[]): string | undefined {
    return blobs.find(blob => Boolean(blob.block_url))?.block_url;
}

function getBlockBaseFeeGwei(blobs: BlobResponse[]): string {
    return blobs.find(blob => Boolean(blob.base_fee_per_blob_gas_gwei))
        ?.base_fee_per_blob_gas_gwei || '0';
}

function getBlobGasUsed(blobs: BlobResponse[]): number {
    return blobs.reduce((total, blob) => total + (blob.blob_gas_used || 0), 0);
}

export function transformNewBlockData(
    blockData: NewBlockData,
    pricingBlock?: BackendBlobPricingRecentBlock
): Block {
    const maxBlobs = pricingBlock?.max_blobs ?? 0;
    const targetBlobs = pricingBlock?.target_blobs || 0;
    const utilizationPercent = pricingBlock?.utilization_percent ?? 0;

    return {
        id: blockData.block_number,
        number: blockData.block_number.toString(),
        blockUrl: getBlockUrl(blockData.blobs),
        blobCount: pricingBlock?.blob_count ?? blockData.blob_count,
        blobGasUsed: pricingBlock?.blob_gas_used ?? getBlobGasUsed(blockData.blobs),
        blobGasTarget: pricingBlock?.blob_gas_target ?? 0,
        blobGasLimit: pricingBlock?.blob_gas_limit ?? 0,
        targetBlobs,
        maxBlobs,
        availableBlobs: pricingBlock?.available_blobs ?? 0,
        baseFeeGwei: pricingBlock?.blob_base_fee_gwei ?? getBlockBaseFeeGwei(blockData.blobs),
        utilizationPercent,
        isFull: pricingBlock?.is_full ?? false,
        isAboveTarget: pricingBlock?.is_above_target ?? false,
        timestamp: blockData.timestamp,
        attribution: getAttributions(blockData.blobs),
        blobs: blockData.blobs
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
 * Get latest blocks with pricing and capacity details.
 * @param limit - Number of blocks to fetch
 * @param network - Optional network parameter
 */
export async function getLatestBlocks(limit = 20, network?: string): Promise<LatestBlocksResponse> {
    const pricingResponse = await fetchApi<ApiResponse<BackendBlobPricingResponse>>(
        `/blob/pricing?blocks=${limit}`,
        network
    );
    const blobLimit = Math.max(limit * pricingResponse.data.blob_params.max, limit);
    const latestBlobsResponse = await fetchApi<ApiResponse<BlobResponse[]>>(
        `/blob/latest?limit=${blobLimit}`,
        network
    );

    const blobsByBlock = new Map<number, BlobResponse[]>();
    for (const blob of latestBlobsResponse.data) {
        if (blob.block_number < 0) continue;

        const blobs = blobsByBlock.get(blob.block_number) || [];
        blobs.push(blob);
        blobsByBlock.set(blob.block_number, blobs);
    }

    const blocks: Block[] = pricingResponse.data.recent_blocks.slice(0, limit).map((block) => {
        const blobs = blobsByBlock.get(block.block_number) || [];

        return transformNewBlockData({
            block_number: block.block_number,
            blob_count: block.blob_count,
            timestamp: block.block_timestamp,
            blobs
        }, block);
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

/**
 * Get a single block by number. The backend has no per-block endpoint, so this
 * walks the latest pricing window and returns the matching block (with blob
 * details) if it falls within the most recent {@link limit} blocks.
 * @param blockNumber - Block number to retrieve
 * @param network - Optional network parameter
 * @param limit - How many recent blocks to scan
 */
export async function getBlockByNumber(
    blockNumber: number,
    network?: string,
    limit = 100,
): Promise<Block | null> {
    const { data } = await getLatestBlocks(limit, network);
    return data.find((block) => block.number === blockNumber.toString()) ?? null;
}
