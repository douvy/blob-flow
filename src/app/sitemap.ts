import type { MetadataRoute } from 'next';
import { CHART_PAGES, DEFAULT_NETWORK, NETWORKS, SITE_URL } from '@/constants';
import { networkPath } from '@/utils';

/**
 * Flagship head-to-head battle pages between the headline rollups, named by
 * their canonical entity slugs (see ENTITY_SLUG_ALIASES in src/lib/vs.ts).
 * The vs routes accept any slug pair, so crawlers cannot discover these
 * without being told; one direction per matchup is enough since the reversed
 * URL renders the same comparison.
 */
const VS_MATCHUPS: ReadonlyArray<readonly [string, string]> = [
  ['base', 'arbitrum-one'],
  ['base', 'op-mainnet'],
  ['base', 'zksync-era'],
  ['arbitrum-one', 'op-mainnet'],
  ['arbitrum-one', 'zksync-era'],
  ['op-mainnet', 'zksync-era'],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // The default network owns the bare paths; every other bootstrap network
  // serves the same pages under its own /[network] prefix. Their copies rank
  // below every default-network page, so the priority drops by a flat step.
  for (const network of Object.values(NETWORKS)) {
    const isDefault = network.apiParam === DEFAULT_NETWORK.apiParam;
    const url = (pagePath: string) =>
      `${SITE_URL}${networkPath(pagePath, network.apiParam)}`;
    const weight = (priority: number) =>
      isDefault ? priority : Math.max(0.1, Math.round((priority - 0.5) * 10) / 10);

    entries.push(
      { url: url('/'), changeFrequency: 'always', priority: weight(1) },
      { url: url('/blocks'), changeFrequency: 'always', priority: weight(0.8) },
      { url: url('/live'), changeFrequency: 'always', priority: weight(0.7) },
      { url: url('/mempool'), changeFrequency: 'always', priority: weight(0.7) },
      { url: url('/records'), changeFrequency: 'hourly', priority: weight(0.7) },
      { url: url('/flippening'), changeFrequency: 'hourly', priority: weight(0.6) },
      { url: url('/card'), changeFrequency: 'weekly', priority: weight(0.5) },
      ...CHART_PAGES.map((chartPage) => ({
        url: url(`/charts/${chartPage.slug}`),
        changeFrequency: 'hourly' as const,
        priority: weight(0.6),
      })),
    );
  }

  // The battle pages exist only at the bare paths.
  entries.push(
    ...VS_MATCHUPS.map(([a, b]) => ({
      url: `${SITE_URL}/vs/${a}/${b}`,
      changeFrequency: 'hourly' as const,
      priority: 0.6,
    })),
  );

  return entries;
}
