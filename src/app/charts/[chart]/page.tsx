import type { Metadata } from 'next';
import { CHART_PAGES } from '@/constants';
import { ogImageMetadata } from '@/lib/og/metadata';
import {
  DEFAULT_TIME_RANGE,
  TIME_RANGE_PARAM,
  parseTimeRange,
  timeRangeQuery,
} from '@/lib/timeRange';
import ChartsPageClient from './ChartsPageClient';

// Server wrapper around the client chart page. Its only job is metadata: the
// Open Graph card mirrors the time range selected in the UI, carried in the
// shared URL as ?range=, and search params are only readable from a server
// page's generateMetadata.
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ chart: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ chart }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const rawRange = resolvedSearchParams[TIME_RANGE_PARAM];
  const range = parseTimeRange(typeof rawRange === 'string' ? rawRange : null) ?? DEFAULT_TIME_RANGE;
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);

  return ogImageMetadata({
    imageUrl: `/charts/${encodeURIComponent(chart)}/opengraph-image${timeRangeQuery(range)}`,
    alt: 'BlobFlow chart: live Ethereum blob market stats',
    title: page?.title,
  });
}

export default function ChartDetailPage() {
  return <ChartsPageClient />;
}
