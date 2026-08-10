import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import UsersLeaderboard from '@/components/UsersLeaderboard';
import Link from '@/components/NetworkLink';
import { usersMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = usersMetadata();

export default function UsersPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link
        href="/"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <section>
        <h1 className="text-3xl font-windsor-bold text-white mb-2">Top Blob Users</h1>
        <p className="text-sm text-bodyText mb-6">
          Rollups and other senders ranked by blobs posted over the selected window, with
          their share of blobspace, total spend, and latest activity. Click any row for
          that entity&apos;s addresses and full history.
        </p>
        <UsersLeaderboard />
      </section>
    </div>
  );
}
