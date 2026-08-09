import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Binary blob payload proxy; nothing indexable lives there. The OG
      // card routes under /api/og stay crawlable so share images resolve.
      disallow: '/api/raw-blob',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
