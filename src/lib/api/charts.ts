import type {
    ApiResponse,
    BackendAttributionUsageChartResponse,
    BackendBlobMarketChartResponse,
    BackendChartGranularity,
    BackendChartRange,
    BackendCostComparisonChartResponse,
    BackendStatsWindowsResponse,
    RollingWindowKey,
} from '../../types';
import { fetchApi } from './core';
import { DEFAULT_STATS_WINDOWS } from './stats';

function buildChartQuery(
    range: BackendChartRange,
    granularity: BackendChartGranularity = 'auto',
    limit?: number,
): string {
    const params = new URLSearchParams({
        range,
        granularity,
    });

    if (limit !== undefined) {
        params.set('limit', limit.toString());
    }

    return params.toString();
}

export async function getBlobMarketChart(
    range: BackendChartRange,
    network?: string,
    granularity: BackendChartGranularity = 'auto',
    limit?: number,
): Promise<BackendBlobMarketChartResponse> {
    const response = await fetchApi<ApiResponse<BackendBlobMarketChartResponse>>(
        `/charts/blob-market?${buildChartQuery(range, granularity, limit)}`,
        network
    );

    return response.data;
}

export async function getAttributionUsageChart(
    range: BackendChartRange,
    network?: string,
    granularity: BackendChartGranularity = 'auto',
    limit?: number,
): Promise<BackendAttributionUsageChartResponse> {
    const response = await fetchApi<ApiResponse<BackendAttributionUsageChartResponse>>(
        `/charts/attribution-usage?${buildChartQuery(range, granularity, limit)}`,
        network
    );

    return response.data;
}

export async function getCostComparisonChart(
    range: BackendChartRange,
    network?: string,
    granularity: BackendChartGranularity = 'auto',
    limit?: number,
): Promise<BackendCostComparisonChartResponse> {
    const response = await fetchApi<ApiResponse<BackendCostComparisonChartResponse>>(
        `/charts/cost-comparison?${buildChartQuery(range, granularity, limit)}`,
        network
    );

    return response.data;
}

export async function getRollingStatsChart(
    windows: RollingWindowKey[] = DEFAULT_STATS_WINDOWS,
    network?: string,
): Promise<BackendStatsWindowsResponse> {
    const windowParam = windows.map(encodeURIComponent).join(',');
    const response = await fetchApi<ApiResponse<BackendStatsWindowsResponse>>(
        `/charts/rolling-stats?windows=${windowParam}`,
        network
    );

    return response.data;
}
