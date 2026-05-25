import { MempoolResponse, MempoolTransaction, ApiResponse, BlobResponse } from '../../types';
import { fetchApi, formatRelativeTime, truncateAddress } from './core';
import {
    formatFeeHeadroom,
    formatGwei,
    formatWeiToEth,
    getBlobCount,
} from '../../utils';

/**
 * Get mempool data (pending blob transactions)
 * @param limit - Number of blobs to fetch
 * @param network - Optional network parameter
 */
export async function getMempool(limit = 10, network?: string): Promise<MempoolResponse> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/mempool?limit=${limit}`, network);

    // Map the API response to our expected format
    const transactions: MempoolTransaction[] = response.data.map((blob: BlobResponse, index: number) => {
        const realizedCost = formatWeiToEth(blob.realized_cost_wei || blob.total_cost_eth);
        const maxCost = formatWeiToEth(blob.max_cost_wei);

        return {
            id: index + 1,
            txHash: blob.tx_hash,
            transactionUrl: blob.transaction_url,
            fromAddress: truncateAddress(blob.from_address),
            fromAddressFull: blob.from_address,
            fromAddressUrl: blob.from_address_url,
            user: blob.user_attribution || null,
            blobCount: getBlobCount(blob.blob_gas_used, blob.blob_size_bytes),
            blobSizeBytes: blob.blob_size_bytes,
            baseFeeGwei: blob.base_fee_per_blob_gas_gwei
                ? formatGwei(blob.base_fee_per_blob_gas_gwei)
                : formatGwei(blob.base_fee_per_blob_gas, { fromWei: true }),
            tipGwei: blob.tip_per_blob_gas_gwei
                ? formatGwei(blob.tip_per_blob_gas_gwei)
                : formatGwei(blob.tip_per_blob_gas, { fromWei: true }),
            maxFeeGwei: blob.max_fee_per_blob_gas_gwei
                ? formatGwei(blob.max_fee_per_blob_gas_gwei)
                : formatGwei(blob.max_fee_per_blob_gas, { fromWei: true }),
            feeHeadroom: formatFeeHeadroom(blob.fee_cap_headroom_percent),
            realizedCost,
            maxCost,
            estimatedCost: realizedCost,
            timeInMempool: formatRelativeTime(blob.timestamp)
        };
    });

    return { data: transactions };
}
