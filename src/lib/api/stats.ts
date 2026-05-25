import {
    StatsResponse,
    ApiResponse,
    BackendStatsResponse,
    BackendStatsWindowsResponse,
    RollingWindowKey,
    WebSocketStatsResponse,
} from '../../types';
import { fetchApi } from './core';
import { formatWeiToEth, formatWeiToReadable } from '../../utils';

export const DEFAULT_STATS_WINDOWS: RollingWindowKey[] = ['5m', '1h', '24h', '7d', '30d'];

export function transformStatsResponse(stats: BackendStatsResponse | WebSocketStatsResponse): StatsResponse {
    return {
        data: {
            averageBaseFee: formatWeiToReadable(stats.average_base_fee || '0'),
            totalBlobs: stats.total_blobs,
            totalConfirmedBlobs: stats.total_confirmed_blobs,
            pendingBlobsCount: stats.total_pending_blobs,
            avgBlobsPerBlock: Math.round(((stats.total_confirmed_blobs || 100) / 100) * 10) / 10,
            averageTip: formatWeiToReadable(stats.average_tip || '0'),
            averageTotalCost: formatWeiToEth(stats.average_total_cost || '0'),
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

/**
 * Get rolling market stats for one or more duration windows.
 * @param windows - Rolling windows to request from the API
 * @param network - Optional network parameter
 */
export async function getStatsWindows(
    windows: RollingWindowKey[] = DEFAULT_STATS_WINDOWS,
    network?: string
): Promise<BackendStatsWindowsResponse> {
    const windowParam = windows.map(encodeURIComponent).join(',');
    const response = await fetchApi<ApiResponse<BackendStatsWindowsResponse>>(
        `/stats/windows?windows=${windowParam}`,
        network
    );

    return response.data;
}
