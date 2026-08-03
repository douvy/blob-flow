import {
    DEFAULT_TIME_RANGE,
    parseTimeRange,
    timeRangeLabel,
    timeRangeQuery,
} from './timeRange';

describe('timeRange', () => {
    it('parses valid ranges and rejects everything else', () => {
        expect(parseTimeRange('1h')).toBe('1h');
        expect(parseTimeRange('24h')).toBe('24h');
        expect(parseTimeRange('7d')).toBe('7d');
        expect(parseTimeRange('30d')).toBe('30d');
        expect(parseTimeRange('all')).toBeNull();
        expect(parseTimeRange('7D')).toBeNull();
        expect(parseTimeRange('')).toBeNull();
        expect(parseTimeRange(null)).toBeNull();
        expect(parseTimeRange(undefined)).toBeNull();
    });

    it('encodes non-default ranges as a query string and the default as none', () => {
        expect(timeRangeQuery(DEFAULT_TIME_RANGE)).toBe('');
        expect(timeRangeQuery('7d')).toBe('?range=7d');
    });

    it('labels ranges for card copy', () => {
        expect(timeRangeLabel('1h')).toBe('last hour');
        expect(timeRangeLabel('24h')).toBe('last 24h');
        expect(timeRangeLabel('30d')).toBe('last 30d');
    });
});
