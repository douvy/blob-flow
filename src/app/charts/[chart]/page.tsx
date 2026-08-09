import type { Metadata } from 'next';
import { chartMetadata } from '@/lib/pageMetadata';
import { rangeFromSearchParams, type SearchParams } from '@/lib/timeRange';
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
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ chart }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  return chartMetadata(chart, undefined, rangeFromSearchParams(resolvedSearchParams));
}

export default function ChartDetailPage() {
  return <ChartsPageClient />;
}
