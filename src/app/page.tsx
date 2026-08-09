import React from 'react';
import type { Metadata } from 'next';
import BlobFeeHero from '@/components/BlobFeeHero';
import DeepLinkedTimeRange from '@/components/DeepLinkedTimeRange';
import LiveMetrics from '@/components/LiveMetrics';
import RelatableStats from '@/components/RelatableStats';
import MetricsCharts from '@/components/MetricsCharts';
import RecentBlocksPanel from '@/components/RecentBlocksPanel';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolSummary from '@/components/MempoolSummary';
import FlippeningSummary from '@/components/FlippeningSummary';
import ExplainerSection from '@/components/ExplainerSection';
import { homeMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = homeMetadata();

export default function Home() {
  return (
    <>
      <DeepLinkedTimeRange />
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
            <FlippeningSummary />
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
