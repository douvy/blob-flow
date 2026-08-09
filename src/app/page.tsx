import React from 'react';
import type { Metadata } from 'next';
import BlobFeeHero from '@/components/BlobFeeHero';
import LiveMetrics from '@/components/LiveMetrics';
import RelatableStats from '@/components/RelatableStats';
import MetricsCharts from '@/components/MetricsCharts';
import RecentBlocksPanel from '@/components/RecentBlocksPanel';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolSummary from '@/components/MempoolSummary';
import ExplainerSection from '@/components/ExplainerSection';
import { homeMetadata } from '@/lib/pageMetadata';
import { rangeFromSearchParams, type SearchParams } from '@/lib/timeRange';

// The Open Graph card mirrors the time range selected in the UI, carried in
// the shared URL as ?range=. Reading searchParams makes this page dynamic;
// its content is client-fetched, so nothing else changes.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  return homeMetadata(undefined, rangeFromSearchParams(await searchParams));
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

      <div className="border-t border-frameLine" />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <RelatableStats />
      </div>
    </>
  );
}
