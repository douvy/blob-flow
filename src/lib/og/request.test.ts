import { hasCanonicalQuery, parseCanonicalBlockNumber } from './request';

function query(search: string): URLSearchParams {
    return new URL(`https://blobflow.com/api/og/home${search}`).searchParams;
}

describe('og/request', () => {
    // Every distinct URL is its own rasterization and CDN entry, so a card
    // must have exactly one spelling.
    describe('hasCanonicalQuery', () => {
        it('accepts the keys a card route understands', () => {
            expect(hasCanonicalQuery(query(''))).toBe(true);
            expect(hasCanonicalQuery(query('?network=sepolia'))).toBe(true);
            expect(hasCanonicalQuery(query('?network=sepolia&range=7d'))).toBe(true);
        });

        it('rejects a cache-busting key riding along', () => {
            expect(hasCanonicalQuery(query('?network=mainnet&nonce=1'))).toBe(false);
            expect(hasCanonicalQuery(query('?utm_source=x'))).toBe(false);
        });

        it('rejects a repeated key, which would be two spellings of one card', () => {
            expect(hasCanonicalQuery(query('?range=1h&range=7d'))).toBe(false);
        });
    });

    describe('parseCanonicalBlockNumber', () => {
        it('accepts plain decimal block numbers', () => {
            expect(parseCanonicalBlockNumber('0')).toBe(0);
            expect(parseCanonicalBlockNumber('21834102')).toBe(21834102);
        });

        it('rejects leading zeros, which address one block many ways', () => {
            expect(parseCanonicalBlockNumber('0000123')).toBeNull();
            expect(parseCanonicalBlockNumber('00')).toBeNull();
        });

        it('rejects non-numeric and non-exact values', () => {
            expect(parseCanonicalBlockNumber('abc')).toBeNull();
            expect(parseCanonicalBlockNumber('1.5')).toBeNull();
            expect(parseCanonicalBlockNumber('-1')).toBeNull();
            expect(parseCanonicalBlockNumber('1e9')).toBeNull();
            expect(parseCanonicalBlockNumber('9'.repeat(400))).toBeNull();
        });
    });
});
