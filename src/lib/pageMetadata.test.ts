import type { Metadata } from 'next';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import {
    blockMetadata,
    chartMetadata,
    homeMetadata,
    liveMetadata,
    transactionMetadata,
    userMetadata,
} from './pageMetadata';

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TX_HASH = `0x${'a'.repeat(64)}`;

function ogImageUrl(metadata: Metadata): string {
    const images = metadata.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    return typeof first === 'object' && first !== null && 'url' in first
        ? String(first.url)
        : '';
}

describe('pageMetadata stat share cards', () => {
    it('names the network and range the dashboard card should report', () => {
        expect(ogImageUrl(homeMetadata('sepolia', '7d'))).toBe(
            '/api/og/home?network=sepolia&range=7d'
        );
    });

    it('falls back to the defaults for an unknown range', () => {
        expect(ogImageUrl(homeMetadata(undefined, 'not-a-range'))).toBe(
            `/api/og/home?network=mainnet&range=${OG_CARD_DEFAULT_RANGE}`
        );
    });

    // The page only rendered because the layout confirmed the network is
    // served, so a network beyond the bootstrap two must reach the card
    // rather than being silently rewritten to mainnet.
    it('carries a network the deployment serves beyond the bootstrap two', () => {
        expect(ogImageUrl(homeMetadata('hoodi'))).toBe(
            `/api/og/home?network=hoodi&range=${OG_CARD_DEFAULT_RANGE}`
        );
        expect(ogImageUrl(blockMetadata('21834102', 'hoodi'))).toBe(
            '/api/og/block/21834102?network=hoodi'
        );
        expect(ogImageUrl(chartMetadata('base-fee', 'hoodi', '7d'))).toBe(
            '/api/og/chart/base-fee?range=7d&network=hoodi'
        );
    });

    it('ignores a network segment that is not even slug-shaped', () => {
        expect(ogImageUrl(homeMetadata('../etc/passwd'))).toBe(
            `/api/og/home?network=mainnet&range=${OG_CARD_DEFAULT_RANGE}`
        );
    });

    it('points block and user pages at their own card, scoped to the network', () => {
        expect(ogImageUrl(blockMetadata('21834102', 'sepolia'))).toBe(
            '/api/og/block/21834102?network=sepolia'
        );
        expect(ogImageUrl(userMetadata(ADDRESS))).toBe(
            `/api/og/user/${ADDRESS}?network=mainnet`
        );
    });

    // The card route serves one URL per card, so metadata must not advertise
    // a spelling the route will 404.
    it('emits only canonical card URLs', () => {
        expect(ogImageUrl(userMetadata(ADDRESS.toUpperCase()))).toBe(
            `/api/og/user/${ADDRESS}?network=mainnet`
        );
        expect(ogImageUrl(blockMetadata('0000123'))).toBe('');
        expect(ogImageUrl(userMetadata('not-an-address'))).toBe('');
    });

    // These inherit the root card unless they set one, and the root card is
    // mainnet's, which would contradict the page they are attached to.
    it('scopes the transaction and live pages to their own network', () => {
        expect(ogImageUrl(transactionMetadata(TX_HASH, 'sepolia'))).toBe(
            '/api/og/home?network=sepolia'
        );
        expect(ogImageUrl(liveMetadata('sepolia'))).toBe('/api/og/home?network=sepolia');
    });

    it('requests a large-image card wherever it names one', () => {
        expect(homeMetadata().twitter?.card).toBe('summary_large_image');
        expect(blockMetadata('1').twitter?.card).toBe('summary_large_image');
        expect(userMetadata(ADDRESS).twitter?.card).toBe('summary_large_image');
        expect(transactionMetadata(TX_HASH).twitter?.card).toBe('summary_large_image');
        expect(liveMetadata().twitter?.card).toBe('summary_large_image');
    });

    it('keeps the canonical URL free of the range, which is a view preference', () => {
        expect(homeMetadata('sepolia', '7d').alternates?.canonical).toBe('/sepolia');
        expect(homeMetadata(undefined, '7d').alternates?.canonical).toBe('/');
    });
});
