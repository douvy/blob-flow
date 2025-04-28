import React from 'react';
import Header from '@/components/Header';
import LiveMetrics from '@/components/LiveMetrics';
import LatestBlocksTable from '@/components/LatestBlocksTable';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-xl font-windsor-bold">
            Real-time metrics and analytics for Ethereum EIP-4844 blob data
          </h2>
        </div>
        <LiveMetrics />
        <LatestBlocksTable />
        <Footer />
      </div>
    </main>
  );
}