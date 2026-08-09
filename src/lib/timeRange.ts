/**
 * The time range selected in the header filter (home and chart pages). Lives
 * outside TimeRangeContext so server code (page metadata, Open Graph image
 * routes) can parse and format ranges without importing a client module.
 */
export type TimeRange = '1h' | '24h' | '7d' | '30d';

export const TIME_RANGES: readonly TimeRange[] = ['1h', '24h', '7d', '30d'];

export const DEFAULT_TIME_RANGE: TimeRange = '1h';

/** Query parameter carrying the selected range in shareable URLs. */
export const TIME_RANGE_PARAM = 'range';

export function parseTimeRange(value: string | null | undefined): TimeRange | null {
    return TIME_RANGES.includes(value as TimeRange) ? (value as TimeRange) : null;
}

/** Route search params, as a server page's generateMetadata receives them. */
export type SearchParams = Record<string, string | string[] | undefined>;

/** The range a page URL asks for, falling back to the default. */
export function rangeFromSearchParams(params: SearchParams): TimeRange {
    const raw = params[TIME_RANGE_PARAM];
    return parseTimeRange(typeof raw === 'string' ? raw : null) ?? DEFAULT_TIME_RANGE;
}

/**
 * Query string that encodes a range in a shareable URL. The default range is
 * carried implicitly (empty string) so unfiltered URLs stay clean.
 */
export function timeRangeQuery(range: TimeRange): string {
    return range === DEFAULT_TIME_RANGE ? '' : `?${TIME_RANGE_PARAM}=${range}`;
}

const RANGE_LABELS: Record<TimeRange, string> = {
    '1h': 'last hour',
    '24h': 'last 24h',
    '7d': 'last 7d',
    '30d': 'last 30d',
};

/** Human label for card copy, e.g. "last 24h". */
export function timeRangeLabel(range: TimeRange): string {
    return RANGE_LABELS[range];
}
