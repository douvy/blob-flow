import type {
    ApiResponse,
    BackendAttributionUsageChartResponse,
    BackendBlobMarketChartResponse,
    BackendBlobPricingResponse,
    BackendCostComparisonChartResponse,
    BackendStatsWindowsResponse,
    NewBlockData,
    UserResponse,
} from '@/types';
import { API_BASE_URL, DEFAULT_NETWORK } from '@/constants';
import { DEFAULT_TIME_RANGE, type TimeRange } from '@/lib/timeRange';

/**
 * Unfurl crawlers (X, Discord, Telegram) give up on slow responses, so the
 * Open Graph image routes use a much shorter timeout than the client API
 * layer and treat every failure as "no data": callers render a branded
 * static fallback card instead of erroring.
 */
export const OG_FETCH_TIMEOUT_MS = 3500;

export async function fetchOgApi<T>(endpoint: string): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    // Unfurl requests carry no user network selection, so the cards always
    // describe the default network. The indexer rejects requests without a
    // network param when it serves multiple networks.
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${API_BASE_URL}${endpoint}${separator}network=${DEFAULT_NETWORK.apiParam}`;

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            // Always render from live data; crawlers cache the resulting
            // image on their side, so the request rate stays low.
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) return null;

        const payload = (await response.json()) as ApiResponse<T>;
        if (!payload || payload.success === false) return null;
        return payload.data ?? null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

export interface HomeOgData {
    pricing: BackendBlobPricingResponse | null;
    attribution: BackendAttributionUsageChartResponse | null;
}

/** Live fee plus rollup shares for the home page card. */
export async function getHomeOgData(range: TimeRange = DEFAULT_TIME_RANGE): Promise<HomeOgData> {
    const [pricing, attribution] = await Promise.all([
        fetchOgApi<BackendBlobPricingResponse>('/blob/pricing?blocks=20'),
        fetchOgApi<BackendAttributionUsageChartResponse>(
            `/charts/attribution-usage?range=${range}&granularity=auto`
        ),
    ]);

    return { pricing, attribution };
}

export function getBlobMarketOgChart(
    range: TimeRange = DEFAULT_TIME_RANGE
): Promise<BackendBlobMarketChartResponse | null> {
    return fetchOgApi<BackendBlobMarketChartResponse>(
        `/charts/blob-market?range=${range}&granularity=auto`
    );
}

export function getAttributionOgChart(
    range: TimeRange = DEFAULT_TIME_RANGE
): Promise<BackendAttributionUsageChartResponse | null> {
    return fetchOgApi<BackendAttributionUsageChartResponse>(
        `/charts/attribution-usage?range=${range}&granularity=auto`
    );
}

export function getCostComparisonOgChart(
    range: TimeRange = DEFAULT_TIME_RANGE
): Promise<BackendCostComparisonChartResponse | null> {
    return fetchOgApi<BackendCostComparisonChartResponse>(
        `/charts/cost-comparison?range=${range}&granularity=auto`
    );
}

export function getRollingStatsOgChart(): Promise<BackendStatsWindowsResponse | null> {
    return fetchOgApi<BackendStatsWindowsResponse>('/stats/windows?windows=1h,24h,7d');
}

export function getBlockOgData(blockNumber: number): Promise<NewBlockData | null> {
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
        return Promise.resolve(null);
    }

    return fetchOgApi<NewBlockData>(`/block/${blockNumber}`);
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function getUserOgData(address: string): Promise<UserResponse | null> {
    // The address comes straight from the URL; only forward well-formed
    // Ethereum addresses to the indexer.
    if (!ADDRESS_PATTERN.test(address)) {
        return Promise.resolve(null);
    }

    return fetchOgApi<UserResponse>(`/users/${address}`);
}
