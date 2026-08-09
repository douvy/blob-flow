import type { NextRequest } from 'next/server';
import { DEFAULT_NETWORK } from '@/constants';
import { DEFAULT_TIME_RANGE, TIME_RANGE_PARAM, parseTimeRange } from '@/lib/timeRange';
import type { OgScope } from './data';

/**
 * Query params the Open Graph image routes read. Pages emit these when they
 * build their og:image URL; the values are echoed straight into an outbound
 * API request, so both are validated here rather than trusted.
 */
export const OG_NETWORK_PARAM = 'network';

const NETWORK_SLUG_PATTERN = /^[a-z0-9-]{1,32}$/;

export function ogNetworkParam(request: NextRequest): string {
    const value = request.nextUrl.searchParams.get(OG_NETWORK_PARAM)?.toLowerCase();
    return value && NETWORK_SLUG_PATTERN.test(value) ? value : DEFAULT_NETWORK.apiParam;
}

/** Network and time range for a card, both defaulted when absent or invalid. */
export function ogScopeFromRequest(request: NextRequest): OgScope {
    return {
        network: ogNetworkParam(request),
        range:
            parseTimeRange(request.nextUrl.searchParams.get(TIME_RANGE_PARAM)) ??
            DEFAULT_TIME_RANGE,
    };
}
