import { parseTimeRange } from '@/constants';
import type { Network } from '@/types';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import { resolveCardNetwork } from '@/lib/serverNetworks';
import { OG_CARD_CACHE_CONTROL } from './card';
import type { OgScope } from './data';

/**
 * Shared request handling for the stat card routes.
 *
 * Every distinct URL is its own rasterization and its own CDN entry, so a
 * card must have exactly one URL. Anything that would let the same card be
 * addressed two ways (an extra query key, a repeated one, a block number with
 * leading zeros) is refused rather than normalized: normalizing still mints a
 * cache entry per spelling, which is the cost worth avoiding.
 */

/**
 * Query keys a card route understands. Anything else is not a card URL. Cards
 * whose subject rides in the path need nothing beyond the scope, so this is
 * also the default set.
 */
const ALLOWED_PARAMS: ReadonlySet<string> = new Set(['network', 'range']);

/**
 * Keys the composed stat card understands. That card has no path of its own:
 * its subject and metrics live in the query string, so it accepts the scope
 * keys plus the two that describe the card (see parseCardParams).
 */
export const STAT_CARD_PARAMS: ReadonlySet<string> = new Set([
    ...ALLOWED_PARAMS,
    'entity',
    'metrics',
]);

export function cardNotFound(): Response {
    return new Response('Not found', {
        status: 404,
        headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
    });
}

/** Whether the query names only keys this route understands, each once. */
export function hasCanonicalQuery(
    params: URLSearchParams,
    allowed: ReadonlySet<string> = ALLOWED_PARAMS
): boolean {
    const seen = new Set<string>();

    for (const key of params.keys()) {
        if (!allowed.has(key) || seen.has(key)) return false;
        seen.add(key);
    }

    return true;
}

/**
 * A block number as it appears in a canonical URL: digits only, no leading
 * zeros, and small enough to be exact as a JS number.
 */
export function parseCanonicalBlockNumber(segment: string): number | null {
    if (!/^(0|[1-9]\d*)$/.test(segment)) return null;

    const blockNumber = Number(segment);
    return Number.isSafeInteger(blockNumber) ? blockNumber : null;
}

/** The network and range a card should report on, both validated. */
export async function cardScope(params: URLSearchParams): Promise<OgScope> {
    return {
        network: await resolveCardNetwork(params.get('network')),
        range: parseTimeRange(params.get('range'), OG_CARD_DEFAULT_RANGE),
    };
}

export async function cardNetwork(params: URLSearchParams): Promise<Network> {
    return resolveCardNetwork(params.get('network'));
}
