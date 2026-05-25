import { StatsResponse, ApiResponse, BackendStatsResponse, WebSocketStatsResponse } from '../../types';
import { fetchApi } from './core';
import { formatCostEthOrWei, formatWeiToReadable } from '../../utils';

export function transformStatsResponse(stats: BackendStatsResponse | WebSocketStatsResponse): StatsResponse {
    return {
        data: {
            averageBaseFee: formatWeiToReadable(stats.average_base_fee || '0'),
            totalBlobs: stats.total_blobs,
            totalConfirmedBlobs: stats.total_confirmed_blobs,
            pendingBlobsCount: stats.total_pending_blobs,
            avgBlobsPerBlock: Math.round(((stats.total_confirmed_blobs || 100) / 100) * 10) / 10,
            averageTip: formatWeiToReadable(stats.average_tip || '0'),
            averageTotalCost: formatCostEthOrWei(stats.average_total_cost || '0'),
            lastIndexedBlock: stats.last_indexed_block,
            lastIndexedTime: stats.last_indexed_time
        }
    };
}

/**
 * Get network stats data
 * @param network - Optional network parameter
 */
export async function getStats(network?: string): Promise<StatsResponse> {
    const response = await fetchApi<ApiResponse<BackendStatsResponse>>(`/stats`, network);

    return transformStatsResponse(response.data);
}
