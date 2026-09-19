import type {
    ApiResponse,
    BackendBuilderDetailResponse,
    BackendBuilderShareChartResponse,
    BackendBuildersResponse,
    BackendChartGranularity,
    BuilderRange,
} from '../../types';
import { fetchApi, isNotFoundError } from './core';

/**
 * Get every builder that produced an indexed block in the window, with its
 * block and blob share, tip bands, and inclusion timings.
 *
 * The response totals only cover blocks that have a builder row, so before the
 * backfill reaches a range they read lower than the blob market for the same
 * window.
 * @param range - Time window to aggregate over
 * @param network - Optional network parameter
 */
export async function getBuilders(
    range: BuilderRange = '24h',
    network?: string,
): Promise<BackendBuildersResponse> {
    const response = await fetchApi<ApiResponse<BackendBuildersResponse>>(
        `/builders?range=${range}`,
        network
    );

    return response.data;
}

/**
 * Get one builder's detail view: its own stats plus the senders it included,
 * the eligible pending blob transactions it left out, and its recent blocks.
 * Returns null when the builder has no block in the window (e.g. a 1h range,
 * or after switching networks while viewing a builder).
 * @param key - Builder key; contains ':' and '-', so it is encoded
 * @param range - Time window to aggregate over
 * @param network - Optional network parameter
 */
export async function getBuilderByKey(
    key: string,
    range: BuilderRange = '24h',
    network?: string,
): Promise<BackendBuilderDetailResponse | null> {
    try {
        const response = await fetchApi<ApiResponse<BackendBuilderDetailResponse>>(
            `/builders/${encodeURIComponent(key)}?range=${range}`,
            network
        );
        return response.data ?? null;
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
}

/**
 * Get builder share over time. The long tail is grouped under the key `other`,
 * and every series has a zero-filled value in every bucket.
 * @param range - Time window to aggregate over
 * @param network - Optional network parameter
 * @param granularity - Bucket size, 'auto' lets the backend pick
 * @param limit - How many builders to break out before grouping the rest
 */
export async function getBuilderShareChart(
    range: BuilderRange = '24h',
    network?: string,
    granularity: BackendChartGranularity = 'auto',
    limit?: number,
): Promise<BackendBuilderShareChartResponse> {
    const params = new URLSearchParams({
        range,
        granularity,
    });

    if (limit !== undefined) {
        params.set('limit', limit.toString());
    }

    const response = await fetchApi<ApiResponse<BackendBuilderShareChartResponse>>(
        `/charts/builder-share?${params.toString()}`,
        network
    );

    return response.data;
}
