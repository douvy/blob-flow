"use client";

import React from 'react';
import Header from '@/components/Header';
import LiveMetrics from '@/components/LiveMetrics';
import MetricsCharts from '@/components/MetricsCharts';
import LatestBlocksTable from '@/components/LatestBlocksTable';
import TopUsersTable from '@/components/TopUsersTable';
import MempoolTable from '@/components/MempoolTable';
import ExplainerSection from '@/components/ExplainerSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Full width LiveMetrics with 4 cards */}
        <div className="mb-12">
          <LiveMetrics />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left Column (60%) */}
          <div className="lg:col-span-3 space-y-8">
            <div className="mb-12">
              <TopUsersTable />
            </div>
            <div className="mb-12">
              <LatestBlocksTable />
            </div>
            <div className="mb-12">
              <MempoolTable />
            </div>
          </div>

          {/* Right Column (40%) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="mb-12">
              <MetricsCharts />
            </div>
            <div className="mb-12 pt-2">
              <h2 className="text-2xl font-windsor-bold text-white mb-3">What are blobs?</h2>
              <ExplainerSection />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
