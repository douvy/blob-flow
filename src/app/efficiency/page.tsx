import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import EfficiencyReportCards from '@/components/EfficiencyReportCards';

export const metadata: Metadata = {
  title: 'Rollup Blobspace Efficiency Report Cards',
  description:
    'Letter grades for how well each rollup uses Ethereum blobspace: blob fill, tip discipline, and fee cap overbidding, scored over recent blobs.',
  alternates: {
    canonical: '/efficiency',
  },
};

export default function EfficiencyPage() {
  return (
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
          Blobspace Efficiency Report Cards
        </h1>
        <p className="text-sm text-bodyText mb-6 max-w-3xl">
          Who actually uses blobspace well? Each rollup is graded on how full
          its blobs are, how much it tips relative to its peers, and how far
          above the going rate it bids its fee cap. Volume buys no points
          here; competence does.
        </p>
        <EfficiencyReportCards />
      </section>
    </div>
  );
}
