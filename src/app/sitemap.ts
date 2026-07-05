import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants';

// Keep in sync with CHART_VIEWS in src/components/charts/chartViews.tsx
// (a "use client" module, so its exports can't be imported here).
const CHART_SLUGS = [
  'base-fee',
  'gas-utilization',
  'l2-usage',
  'cost-comparison',
  'rolling-market-stats',
];

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
    ...CHART_SLUGS.map((slug) => ({
      url: `${SITE_URL}/charts/${slug}`,
      changeFrequency: 'hourly' as const,
      priority: 0.6,
    })),
  ];
}
