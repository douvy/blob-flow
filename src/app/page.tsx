"use client";

import React from 'react';
import Header from '@/components/Header';
import BlobFeeHero from '@/components/BlobFeeHero';
import LiveMetrics from '@/components/LiveMetrics';
import MetricsCharts from '@/components/MetricsCharts';
import RecentBlocksPanel from '@/components/RecentBlocksPanel';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolTable from '@/components/MempoolTable';
import ExplainerSection from '@/components/ExplainerSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <div className="gutter-lines" aria-hidden="true" />
      <div className="gutter-line-cap" aria-hidden="true" />
      <div className="content-area">
        <Header />
        <div className="container mx-auto px-4 pt-10 pb-6 max-w-7xl">
        <div className="mb-8">
          <BlobFeeHero />
        </div>
        </div>

        <div className="border-t border-[rgba(50,60,80,0.4)]" />

        <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 pt-8">
          <LiveMetrics />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
          <div className="space-y-8">
            <RecentBlocksPanel />
            <MempoolTable />
          </div>
          <MetricsCharts />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="mb-8">
              <TopUsersTable />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-8 pt-2">
              <h2 className="text-2xl font-windsor-bold text-white mb-3">What are blobs?</h2>
              <ExplainerSection />
            </div>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    </main>
  );
}
