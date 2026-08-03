import React from 'react';
import type { Metadata } from 'next';
import BlobFeeHero from '@/components/BlobFeeHero';
import LiveMetrics from '@/components/LiveMetrics';
import MetricsCharts from '@/components/MetricsCharts';
import RecentBlocksPanel from '@/components/RecentBlocksPanel';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolSummary from '@/components/MempoolSummary';
import ExplainerSection from '@/components/ExplainerSection';
import { ogImageMetadata } from '@/lib/og/metadata';
import {
  DEFAULT_TIME_RANGE,
  TIME_RANGE_PARAM,
  parseTimeRange,
  timeRangeQuery,
} from '@/lib/timeRange';

// The Open Graph card mirrors the time range selected in the UI, carried in
// the shared URL as ?range=. Reading searchParams makes this page dynamic;
// its content is client-fetched, so nothing else changes.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const rawRange = resolvedParams[TIME_RANGE_PARAM];
  const range = parseTimeRange(typeof rawRange === 'string' ? rawRange : null) ?? DEFAULT_TIME_RANGE;

  return {
    alternates: {
      canonical: '/',
    },
    ...ogImageMetadata({
      imageUrl: `/opengraph-image${timeRangeQuery(range)}`,
      alt: 'BlobFlow: live Ethereum blob base fee and top rollup blob shares',
    }),
  };
}

export default function Home() {
  return (
    <>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <h1 className="sr-only">Real-time Ethereum blob analytics</h1>
        <BlobFeeHero />
      </div>

      <div className="border-t border-frameLine" />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <LiveMetrics />
      </div>

      <div className="border-t border-frameLine" />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <RecentBlocksPanel />
            <MempoolSummary />
            <TopUsersTable />
            <section>
              <h2 className="text-2xl font-windsor-bold text-white mb-4">What are blobs?</h2>
              <ExplainerSection />
            </section>
          </div>
          <MetricsCharts />
        </div>
      </div>
    </>
  );
}
