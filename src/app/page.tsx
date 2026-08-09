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

/**
 * The dashboard's share card reports over the header's range, which the URL
 * carries as ?range=. Only pages receive searchParams, never layouts, which
 * is why this is generateMetadata rather than a static export. The page's own
 * content is client-fetched, so nothing else changes.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const range = Array.isArray(query.range) ? query.range[0] : query.range;

  return homeMetadata(undefined, range);
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
