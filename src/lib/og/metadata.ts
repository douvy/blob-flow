import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/constants';
import { OG_SIZE } from './card';

/**
 * Open Graph and Twitter metadata pointing at a dynamic image route.
 *
 * Pages whose Open Graph image URL depends on a query param (the selected
 * time range) cannot use the opengraph-image file convention: those routes
 * never receive search params, and their file-based tags would override any
 * config-based images. Such pages emit config metadata via this helper
 * instead. Next replaces the whole openGraph and twitter objects per
 * segment, so the site strings are restated here rather than inherited.
 */
export function ogImageMetadata({
    imageUrl,
    alt,
    title = SITE_TITLE,
    description = SITE_DESCRIPTION,
}: {
    imageUrl: string;
    alt: string;
    title?: string;
    description?: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
    const image = { url: imageUrl, width: OG_SIZE.width, height: OG_SIZE.height, alt };

    return {
        openGraph: {
            type: 'website',
            siteName: SITE_NAME,
            title,
            description,
            images: [image],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
    };
}
