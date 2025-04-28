import React from 'react';
import Header from '@/components/Header';
import LiveMetrics from '@/components/LiveMetrics';
import LatestBlocksTable from '@/components/LatestBlocksTable';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <Header />
        <LiveMetrics />
        <LatestBlocksTable />
        <Footer />
      </div>
    </main>
  );
}