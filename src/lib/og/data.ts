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

/** What a card is about: which network, over which window. */
export interface OgScope {
    network: string;
    range: TimeRange;
}

export const DEFAULT_OG_SCOPE: OgScope = {
    network: DEFAULT_NETWORK.apiParam,
    range: DEFAULT_TIME_RANGE,
};

export async function fetchOgApi<T>(
    endpoint: string,
    network: string = DEFAULT_NETWORK.apiParam
): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    // The indexer rejects requests without a network param when it serves
    // multiple networks, and the network is part of what the card reports.
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${API_BASE_URL}${endpoint}${separator}network=${encodeURIComponent(network)}`;

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
export async function getHomeOgData({
    network,
    range,
}: OgScope = DEFAULT_OG_SCOPE): Promise<HomeOgData> {
    const [pricing, attribution] = await Promise.all([
        fetchOgApi<BackendBlobPricingResponse>('/blob/pricing?blocks=20', network),
        fetchOgApi<BackendAttributionUsageChartResponse>(
            `/charts/attribution-usage?range=${range}&granularity=auto`,
            network
        ),
    ]);

    return { pricing, attribution };
}

export function getBlobMarketOgChart({
    network,
    range,
}: OgScope = DEFAULT_OG_SCOPE): Promise<BackendBlobMarketChartResponse | null> {
    return fetchOgApi<BackendBlobMarketChartResponse>(
        `/charts/blob-market?range=${range}&granularity=auto`,
        network
    );
}

export function getAttributionOgChart({
    network,
    range,
}: OgScope = DEFAULT_OG_SCOPE): Promise<BackendAttributionUsageChartResponse | null> {
    return fetchOgApi<BackendAttributionUsageChartResponse>(
        `/charts/attribution-usage?range=${range}&granularity=auto`,
        network
    );
}

export function getCostComparisonOgChart({
    network,
    range,
}: OgScope = DEFAULT_OG_SCOPE): Promise<BackendCostComparisonChartResponse | null> {
    return fetchOgApi<BackendCostComparisonChartResponse>(
        `/charts/cost-comparison?range=${range}&granularity=auto`,
        network
    );
}

export function getRollingStatsOgChart({
    network,
}: OgScope = DEFAULT_OG_SCOPE): Promise<BackendStatsWindowsResponse | null> {
    return fetchOgApi<BackendStatsWindowsResponse>('/stats/windows?windows=1h,24h,7d', network);
}

export function getBlockOgData(
    blockNumber: number,
    network: string = DEFAULT_NETWORK.apiParam
): Promise<NewBlockData | null> {
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
        return Promise.resolve(null);
    }

    return fetchOgApi<NewBlockData>(`/block/${blockNumber}`, network);
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function getUserOgData(
    address: string,
    network: string = DEFAULT_NETWORK.apiParam
): Promise<UserResponse | null> {
    // The address comes straight from the URL; only forward well-formed
    // Ethereum addresses to the indexer.
    if (!ADDRESS_PATTERN.test(address)) {
        return Promise.resolve(null);
    }

    return fetchOgApi<UserResponse>(`/users/${address}`, network);
}
