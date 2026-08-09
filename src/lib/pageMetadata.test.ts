import type { Metadata } from 'next';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import { blockMetadata, homeMetadata, userMetadata } from './pageMetadata';

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

    it('falls back to the defaults for an unknown network or range', () => {
        // Both reach the card URL from the address bar, so neither is trusted.
        expect(ogImageUrl(homeMetadata('not-a-network', 'not-a-range'))).toBe(
            `/api/og/home?network=mainnet&range=${OG_CARD_DEFAULT_RANGE}`
        );
    });

    it('points block and user pages at their own card, scoped to the network', () => {
        expect(ogImageUrl(blockMetadata('21834102', 'sepolia'))).toBe(
            '/api/og/block/21834102?network=sepolia'
        );
        expect(
            ogImageUrl(userMetadata('0x1234567890abcdef1234567890abcdef12345678'))
        ).toBe('/api/og/user/0x1234567890abcdef1234567890abcdef12345678?network=mainnet');
    });

    it('requests a large-image card wherever it names one', () => {
        expect(homeMetadata().twitter?.card).toBe('summary_large_image');
        expect(blockMetadata('1').twitter?.card).toBe('summary_large_image');
        expect(userMetadata('0xabc').twitter?.card).toBe('summary_large_image');
    });

    it('keeps the canonical URL free of the range, which is a view preference', () => {
        expect(homeMetadata('sepolia', '7d').alternates?.canonical).toBe('/sepolia');
        expect(homeMetadata(undefined, '7d').alternates?.canonical).toBe('/');
    });
});
