import {
    ApiResponse,
    BlobResponse,
    MempoolResponse,
    MempoolTransaction
} from '../../types';
import { fetchApi, truncateAddress } from './core';
import {
    formatBlobFee,
    formatBlobTotalCost,
    formatBlobWeiCost,
    formatFeeHeadroom,
    getBlobCount,
} from '../../utils';

export function transformBlobToMempoolTransaction(blob: BlobResponse, index: number): MempoolTransaction {
    const realizedCost = blob.realized_cost_wei
        ? formatBlobWeiCost(blob.realized_cost_wei)
        : formatBlobTotalCost(blob.total_cost_wei || blob.total_cost_eth);

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
        baseFeeGwei: formatBlobFee(blob.base_fee_per_blob_gas_gwei, blob.base_fee_per_blob_gas),
        tipGwei: formatBlobFee(blob.tip_per_blob_gas_gwei, blob.tip_per_blob_gas),
        maxFeeGwei: formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas),
        feeHeadroom: formatFeeHeadroom(blob.fee_cap_headroom_percent),
        realizedCost,
        maxCost: formatBlobWeiCost(blob.max_cost_wei),
        estimatedCost: realizedCost,
        timeInMempool: blob.timestamp,
        rawBlob: blob,
    };
}

export function transformBlobResponsesToMempool(blobsResponse: BlobResponse[]): MempoolResponse {
    const transactions: MempoolTransaction[] = blobsResponse.map(transformBlobToMempoolTransaction);

    return { data: transactions };
}

/**
 * Get mempool data (pending blob transactions)
 * @param limit - Number of blobs to fetch
 * @param network - Optional network parameter
 */
export async function getMempool(limit = 10, network?: string): Promise<MempoolResponse> {
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`/blob/mempool?limit=${limit}`, network);

    return transformBlobResponsesToMempool(response.data);
}
