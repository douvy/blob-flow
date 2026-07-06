import type { MetadataRoute } from 'next';
import { CHART_PAGES, SITE_URL } from '@/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blocks`,
      changeFrequency: 'always',
      priority: 0.8,
    },
    ...CHART_PAGES.map((chartPage) => ({
      url: `${SITE_URL}/charts/${chartPage.slug}`,
      changeFrequency: 'hourly' as const,
      priority: 0.6,
    })),
  ];
}
