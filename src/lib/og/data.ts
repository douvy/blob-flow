import type {
    ApiResponse,
    BackendAttributionUsageChartResponse,
    BackendBlobPricingResponse,
    NewBlockData,
    Network,
    UserResponse,
} from '@/types';
import { API_BASE_URL, DEFAULT_NETWORK, DEFAULT_TIME_RANGE, type TimeRange } from '@/constants';

/**
 * Backend reads for the stat share cards (dashboard, block, sender). The
 * chart cards read their series through lib/ogChartSeries instead.
 *
 * Unfurl crawlers give up on slow responses, so these use a much shorter
 * timeout than the client API layer and treat every failure as "no data":
 * callers render a branded fallback card rather than erroring.
 */
export const OG_FETCH_TIMEOUT_MS = 3500;

/** What a card is about: which network, over which window. */
export interface OgScope {
    network: Network;
    range: TimeRange;
}

export const DEFAULT_OG_SCOPE: OgScope = {
    network: DEFAULT_NETWORK,
    range: DEFAULT_TIME_RANGE,
};

export async function fetchOgApi<T>(
    endpoint: string,
    network: Network = DEFAULT_NETWORK
): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    // The indexer rejects requests without a network param when it serves
    // multiple networks, and the network is part of what the card reports.
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${API_BASE_URL}${endpoint}${separator}network=${network.apiParam}`;

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            // Always render from live data; the route's own Cache-Control is
            // what keeps repeat unfurls off the backend.
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

/** Live fee plus rollup shares for the dashboard card. */
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

export function getBlockOgData(
    blockNumber: number,
    network: Network = DEFAULT_NETWORK
): Promise<NewBlockData | null> {
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
        return Promise.resolve(null);
    }

    return fetchOgApi<NewBlockData>(`/block/${blockNumber}`, network);
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** Whether a URL segment is shaped like an address the indexer can look up. */
export function isBlobSenderAddress(address: string): boolean {
    return ADDRESS_PATTERN.test(address);
}

export function getUserOgData(
    address: string,
    network: Network = DEFAULT_NETWORK
): Promise<UserResponse | null> {
    // The address comes straight from the URL; only forward well-formed
    // Ethereum addresses to the indexer.
    if (!isBlobSenderAddress(address)) {
        return Promise.resolve(null);
    }

    return fetchOgApi<UserResponse>(`/users/${address}`, network);
}
