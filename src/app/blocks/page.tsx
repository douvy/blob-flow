"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LatestBlocksTable from '@/components/LatestBlocksTable';

export default function BlocksPage() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <div className="gutter-lines" aria-hidden="true" />
      <div className="gutter-line-cap" aria-hidden="true" />
      <div className="content-area">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link
          href="/"
          className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <section>
          <h1 className="text-3xl font-windsor-bold text-white mb-2">
            Latest Blocks &amp; Blob Fees
          </h1>
          <p className="text-sm text-bodyText mb-6">
            Browse recent blocks with blob counts, fees, and per-blob details. Click any row to
            expand its blob breakdown.
          </p>
          <LatestBlocksTable />
        </section>
      </div>
        <Footer />
      </div>
    </main>
  );
}
