"use client";

import React from 'react';
import BlobFeeHero from '@/components/BlobFeeHero';
import LiveMetrics from '@/components/LiveMetrics';
import MetricsCharts from '@/components/MetricsCharts';
import RecentBlocksPanel from '@/components/RecentBlocksPanel';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolTable from '@/components/MempoolTable';
import ExplainerSection from '@/components/ExplainerSection';

export default function Home() {
  return (
    <>
      <div className="container mx-auto px-4 pt-12 pb-16 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-windsor-bold text-white">
            Real-time Ethereum blob analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-bodyText">
            Live EIP-4844 blob base fees, blockspace usage, and L2 rollup
            activity — streamed block by block as the chain moves.
          </p>
        </div>
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
            <MempoolTable />
            <TopUsersTable />
            <section>
              <h2 className="text-2xl font-windsor-bold text-white mb-3">What are blobs?</h2>
              <ExplainerSection />
            </section>
          </div>
          <MetricsCharts />
        </div>
      </div>
    </>
  );
}
