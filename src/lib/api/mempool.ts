import {
    ApiResponse,
    BackendMempoolPressureResponse,
    BlobResponse,
    MempoolPressure,
    MempoolResponse,
    MempoolTransaction
} from '../../types';
import { fetchApi, formatRelativeTime, truncateAddress } from './core';
import {
    formatDuration,
    formatFeeHeadroom,
    formatGwei,
    formatCostEthOrWei,
    formatWeiToEth,
    formatWeiToGwei,
    getBlobCount,
} from '../../utils';

function safeFormat(formatter: () => string): string {
    try {
        return formatter();
    } catch {
        return '-';
    }
}

function formatBlobFee(gweiValue?: string, weiValue?: string): string {
    if (gweiValue) {
        return safeFormat(() => formatGwei(gweiValue));
    }

    if (weiValue) {
        return safeFormat(() => formatWeiToGwei(weiValue));
    }

    return '-';
}

function formatBlobWeiCost(weiValue?: string): string {
    if (!weiValue) return '-';

    return safeFormat(() => formatWeiToEth(weiValue, true));
}

function formatBlobTotalCost(totalCost?: string): string {
    if (!totalCost) return '-';
    if (totalCost.includes('.')) {
        return safeFormat(() => formatCostEthOrWei(totalCost));
    }

    return formatBlobWeiCost(totalCost);
}

export function transformBlobToMempoolTransaction(blob: BlobResponse, index: number): MempoolTransaction {
    const realizedCost = blob.realized_cost_wei
        ? formatBlobWeiCost(blob.realized_cost_wei)
        : formatBlobTotalCost(blob.total_cost_eth);

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
        timeInMempool: formatRelativeTime(blob.timestamp),
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
