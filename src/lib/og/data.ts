import type {
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
 * timeout than the client API layer and never retry.
 */
export const OG_FETCH_TIMEOUT_MS = 3500;

/**
 * Why a read produced no data. "missing" means the backend answered that the
 * thing does not exist, which is a property of the URL and so should 404 the
 * card. "unavailable" means the backend could not answer (down, slow,
 * malformed), which says nothing about the URL and so should still render a
 * branded fallback: a transient outage must not teach a crawler that a real
 * page has no card.
 */
export type OgFetchResult<T> =
    | { status: 'ok'; data: T }
    | { status: 'missing' }
    | { status: 'unavailable' };

/** What a card is about: which network, over which window. */
export interface OgScope {
    network: Network;
    range: TimeRange;
}

export const DEFAULT_OG_SCOPE: OgScope = {
    network: DEFAULT_NETWORK,
    range: DEFAULT_TIME_RANGE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export async function fetchOgApi<T>(
    endpoint: string,
    network: Network = DEFAULT_NETWORK,
    /**
     * Rejects a payload that parsed but is not the shape the card reads, so a
     * half-populated response becomes a fallback card rather than a throw
     * deep inside a builder.
     */
    isValid: (data: unknown) => data is T = isRecord as (data: unknown) => data is T
): Promise<OgFetchResult<T>> {
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

        if (response.status === 404) return { status: 'missing' };
        if (!response.ok) return { status: 'unavailable' };

        const payload: unknown = await response.json();
        if (!isRecord(payload) || payload.success === false) {
            return { status: 'unavailable' };
        }

        const data = payload.data;
        if (data === null || data === undefined) return { status: 'missing' };
        if (!isValid(data)) return { status: 'unavailable' };

        return { status: 'ok', data };
    } catch {
        return { status: 'unavailable' };
    } finally {
        clearTimeout(timeoutId);
    }
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isNumericString(value: unknown): boolean {
    return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
}

/** Every field buildHomeCard reads off a pricing response. */
function isUsablePricing(data: unknown): data is BackendBlobPricingResponse {
    if (!isRecord(data)) return false;
    const pressure = data.market_pressure;

    return (
        isNumericString(data.current_base_fee_gwei) &&
        isNumericString(data.predicted_next_fee_gwei) &&
        isRecord(pressure) &&
        isFiniteNumber(pressure.percent_recent_blocks_at_max_blobs)
    );
}

/** Every field the dashboard and rollup-share copy reads off attribution. */
function isUsableAttribution(data: unknown): data is BackendAttributionUsageChartResponse {
    if (!isRecord(data)) return false;
    const summary = data.summary;

    return (
        isRecord(summary) &&
        isFiniteNumber(summary.total_blobs) &&
        Array.isArray(summary.shares)
    );
}

function isUsableBlock(data: unknown): data is NewBlockData {
    if (!isRecord(data)) return false;

    // pricing is absent on older backends; the builder already handles that.
    return isFiniteNumber(data.block_number) && isFiniteNumber(data.blob_count);
}

function isUsableUser(data: unknown): data is UserResponse {
    if (!isRecord(data)) return false;

    return typeof data.address === 'string' && isFiniteNumber(data.blob_count);
}

export interface HomeOgData {
    pricing: BackendBlobPricingResponse | null;
    attribution: BackendAttributionUsageChartResponse | null;
}

/**
 * Live fee plus rollup shares for the dashboard card. The dashboard is never
 * "missing": with no pricing the card falls back to its branded form, so both
 * failure kinds collapse to null here.
 */
export async function getHomeOgData({
    network,
    range,
}: OgScope = DEFAULT_OG_SCOPE): Promise<HomeOgData> {
    const [pricing, attribution] = await Promise.all([
        fetchOgApi<BackendBlobPricingResponse>('/blob/pricing?blocks=20', network, isUsablePricing),
        fetchOgApi<BackendAttributionUsageChartResponse>(
            `/charts/attribution-usage?range=${range}&granularity=auto`,
            network,
            isUsableAttribution
        ),
    ]);

    return {
        pricing: pricing.status === 'ok' ? pricing.data : null,
        attribution: attribution.status === 'ok' ? attribution.data : null,
    };
}

export async function getBlockOgData(
    blockNumber: number,
    network: Network = DEFAULT_NETWORK
): Promise<OgFetchResult<NewBlockData>> {
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
        return { status: 'missing' };
    }

    const result = await fetchOgApi<NewBlockData>(
        `/block/${blockNumber}`,
        network,
        isUsableBlock
    );

    // A response for a different block would be labeled with the requested
    // one, so a mismatch is treated as no answer rather than rendered.
    if (result.status === 'ok' && result.data.block_number !== blockNumber) {
        return { status: 'unavailable' };
    }

    return result;
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/** Whether a URL segment is shaped like an address the indexer can look up. */
export function isBlobSenderAddress(address: string): boolean {
    return ADDRESS_PATTERN.test(address);
}

export async function getUserOgData(
    address: string,
    network: Network = DEFAULT_NETWORK
): Promise<OgFetchResult<UserResponse>> {
    // The address comes straight from the URL; only forward well-formed
    // Ethereum addresses to the indexer.
    if (!isBlobSenderAddress(address)) {
        return { status: 'missing' };
    }

    const result = await fetchOgApi<UserResponse>(`/users/${address}`, network, isUsableUser);

    // Same reasoning as blocks: a card must not attribute one sender's
    // numbers to another's address.
    if (
        result.status === 'ok' &&
        result.data.address.toLowerCase() !== address.toLowerCase()
    ) {
        return { status: 'unavailable' };
    }

    return result;
}
