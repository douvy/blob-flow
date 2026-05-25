import {
    ApiResponse,
    BackendMempoolPressureResponse,
    BlobResponse,
    MempoolPressure,
    MempoolResponse,
    MempoolTransaction
} from '../../types';
import { fetchApi, formatRelativeTime, truncateAddress } from './core';
import { formatCostEthOrWei, formatDuration, formatWeiToGwei } from '../../utils';

export function transformBlobToMempoolTransaction(blob: BlobResponse, index: number): MempoolTransaction {
    return {
        id: index + 1,
        txHash: blob.tx_hash,
        fromAddress: truncateAddress(blob.from_address),
        user: blob.user_attribution || null,
        blobCount: 1,
        estimatedCost: formatCostEthOrWei(blob.total_cost_eth),
        timeInMempool: formatRelativeTime(blob.timestamp),
        rawBlob: blob,
    };
}

export function transformBlobResponsesToMempool(blobsResponse: BlobResponse[]): MempoolResponse {
    // Map the API response to our expected format
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

/**
 * Get current mempool inclusion pressure for pending blob transactions.
 * @param network - Optional network parameter
 */
export async function getMempoolPressure(network?: string): Promise<MempoolPressure> {
    const response = await fetchApi<ApiResponse<BackendMempoolPressureResponse>>(
        '/blob/mempool/pressure',
        network
    );

    const pressure = response.data;

    return {
        networkId: pressure.network_id,
        networkName: pressure.network_name,
        pendingBlobCount: pressure.pending_blob_count,
        pendingBlobGas: pressure.pending_blob_gas,
        pendingUniqueSenders: pressure.pending_unique_senders,
        feeDistribution: {
            min: formatWeiToGwei(pressure.max_fee_per_blob_gas.min),
            avg: formatWeiToGwei(pressure.max_fee_per_blob_gas.avg),
            median: formatWeiToGwei(pressure.max_fee_per_blob_gas.median),
            p95: formatWeiToGwei(pressure.max_fee_per_blob_gas.p95),
            max: formatWeiToGwei(pressure.max_fee_per_blob_gas.max),
        },
        pendingTransactionAge: {
            oldest: formatDuration(pressure.pending_tx_age.oldest_age_seconds),
            newest: formatDuration(pressure.pending_tx_age.newest_age_seconds),
            average: formatDuration(pressure.pending_tx_age.average_age_seconds),
            oldestSeconds: pressure.pending_tx_age.oldest_age_seconds,
            newestSeconds: pressure.pending_tx_age.newest_age_seconds,
            averageSeconds: pressure.pending_tx_age.average_age_seconds,
            oldestTimestamp: pressure.pending_tx_age.oldest_timestamp,
            newestTimestamp: pressure.pending_tx_age.newest_timestamp,
        },
        includability: {
            latestBlobBaseFee: formatWeiToGwei(pressure.includability.latest_blob_base_fee),
            pricingAvailable: pressure.includability.pricing_available,
            likelyIncludableCount: pressure.includability.likely_includable_count,
            underpricedCount: pressure.includability.underpriced_count,
            unknownPricingCount: pressure.includability.unknown_pricing_count,
        },
        sampleLimit: pressure.sample_limit,
        sampleTruncated: pressure.sample_truncated,
        generatedAt: pressure.generated_at,
    };
}
