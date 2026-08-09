import { chartMetadata, blockMetadata, homeMetadata, userMetadata } from './pageMetadata';

function ogImageUrl(metadata: ReturnType<typeof homeMetadata>): string {
    const images = metadata.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    return typeof first === 'object' && first !== null && 'url' in first
        ? String(first.url)
        : '';
}

describe('pageMetadata Open Graph images', () => {
    it('keeps the image URL clean at the default network and range', () => {
        expect(ogImageUrl(homeMetadata())).toBe('/opengraph-image');
        expect(ogImageUrl(homeMetadata(undefined, '1h'))).toBe('/opengraph-image');
        expect(ogImageUrl(homeMetadata('mainnet', '1h'))).toBe('/opengraph-image');
    });

    it('carries a non-default network and range into the image URL', () => {
        expect(ogImageUrl(homeMetadata('sepolia', '7d'))).toBe(
            '/opengraph-image?network=sepolia&range=7d'
        );
        expect(ogImageUrl(chartMetadata('base-fee', 'sepolia', '30d'))).toBe(
            '/charts/base-fee/opengraph-image?network=sepolia&range=30d'
        );
    });

    it('points block and user pages at their own cards, scoped to the network', () => {
        expect(ogImageUrl(blockMetadata('21834102', 'sepolia'))).toBe(
            '/block/21834102/opengraph-image?network=sepolia'
        );
        expect(
            ogImageUrl(userMetadata('0x1234567890abcdef1234567890abcdef12345678'))
        ).toBe('/user/0x1234567890abcdef1234567890abcdef12345678/opengraph-image');
    });

    it('requests a large-image card everywhere it names an image', () => {
        expect(homeMetadata().twitter?.card).toBe('summary_large_image');
        expect(chartMetadata('base-fee').twitter?.card).toBe('summary_large_image');
    });

    it('keeps the canonical URL free of the range, which is a view preference', () => {
        expect(homeMetadata('sepolia', '7d').alternates?.canonical).toBe('/sepolia');
        expect(chartMetadata('base-fee', undefined, '7d').alternates?.canonical).toBe(
            '/charts/base-fee'
        );
    });
});
