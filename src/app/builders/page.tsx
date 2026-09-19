import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import BuildersLeaderboard from '@/components/BuildersLeaderboard';
import BuilderShareSection from '@/components/BuilderShareSection';
import Link from '@/components/NetworkLink';
import { buildersMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = buildersMetadata();

export default function BuildersPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href="/"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <section>
        <h1 className="text-3xl font-windsor-bold text-white mb-2">Block Builders</h1>
        <p className="text-sm text-bodyText mb-6">
          The block builders behind the blocks we indexed in the selected window: how many
          blocks and blobs each one built, the tips the blob transactions it included paid,
          how long those transactions waited for inclusion, and the eligible pending blob
          transactions it left out. Click any row for that builder&apos;s senders, skipped
          transactions, and recent blocks.
        </p>

        <div className="mb-8">
          <BuilderShareSection />
        </div>

        <BuildersLeaderboard />
      </section>
    </div>
  );
}
