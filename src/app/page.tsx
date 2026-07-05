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
          </div>
          <MetricsCharts />
        </div>
      </div>

      <div className="border-t border-frameLine" />

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <TopUsersTable />
          </div>
          <div className="lg:col-span-2 pt-2">
            <h2 className="text-2xl font-windsor-bold text-white mb-3">What are blobs?</h2>
            <ExplainerSection />
          </div>
        </div>
      </div>
    </>
  );
}
