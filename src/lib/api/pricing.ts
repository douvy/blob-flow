import {
    ApiResponse,
    BackendBlobPricingRecentBlock,
    BackendBlobPricingResponse,
    BlobPricing,
    BlobPricingRecentBlock
} from '../../types';
import { formatGwei, formatWeiToGwei } from '../../utils';
import { fetchApi } from './core';

/**
 * Get current blob fee pricing and recent market pressure.
 * @param network - Optional network parameter
 * @param blocks - Number of recent blocks to include
 */
export async function getBlobPricing(network?: string, blocks = 20): Promise<BlobPricing> {
    const response = await fetchApi<ApiResponse<BackendBlobPricingResponse>>(
        `/blob/pricing?blocks=${blocks}`,
        network
    );

    return mapBlobPricing(response.data);
}

function mapBlobPricing(pricing: BackendBlobPricingResponse): BlobPricing {
    return {
        networkId: pricing.network_id,
        networkName: pricing.network_name,
        currentBaseFee: formatGwei(pricing.current_base_fee_gwei),
        currentBaseFeeWei: pricing.current_base_fee,
        currentBaseFeeGwei: pricing.current_base_fee_gwei,
        currentExcessGas: pricing.current_excess_gas,
        currentUtilization: Number(pricing.current_utilization),
        predictedNextFee: formatGwei(pricing.predicted_next_fee_gwei),
        predictedNextFeeGwei: pricing.predicted_next_fee_gwei,
        forkStage: pricing.fork_stage,
        blobParams: {
            target: pricing.blob_params.target,
            max: pricing.blob_params.max,
            updateFraction: pricing.blob_params.update_fraction,
            targetGas: pricing.blob_params.target_gas,
            maxGas: pricing.blob_params.max_gas,
        },
        marketPressure: {
            recentBlocksAboveTarget: pricing.market_pressure.recent_blocks_above_target,
            consecutiveFullBlocks: pricing.market_pressure.consecutive_full_blocks,
            percentRecentBlocksAtMaxBlobs: pricing.market_pressure.percent_recent_blocks_at_max_blobs,
            predictedDirection: pricing.market_pressure.predicted_direction,
            nextBlockFeeEstimate: {
                low: formatWeiToGwei(pricing.market_pressure.next_block_fee_estimate.low),
                high: formatWeiToGwei(pricing.market_pressure.next_block_fee_estimate.high),
            },
        },
        recentBlocks: pricing.recent_blocks.map(transformPricingRecentBlock),
    };
}

/**
 * Transform a backend pricing block record (also delivered on `new_block`
 * WebSocket events) into the frontend shape.
 */
export function transformPricingRecentBlock(block: BackendBlobPricingRecentBlock): BlobPricingRecentBlock {
    return {
        blockNumber: block.block_number,
        blockTimestamp: block.block_timestamp,
        blobCount: block.blob_count,
        blobGasUsed: block.blob_gas_used,
        blobGasTarget: block.blob_gas_target,
        blobGasLimit: block.blob_gas_limit,
        excessBlobGas: block.excess_blob_gas,
        blobBaseFee: formatGwei(block.blob_base_fee_gwei),
        blobBaseFeeGwei: block.blob_base_fee_gwei,
        utilizationRatio: Number(block.utilization_ratio),
        targetBlobs: block.target_blobs,
        maxBlobs: block.max_blobs,
        availableBlobs: block.available_blobs,
        utilizationPercent: block.utilization_percent,
        isFull: block.is_full,
        isAboveTarget: block.is_above_target,
    };
}
