import { Suspense } from 'react';
import type { Metadata } from 'next';
import StatCardComposer from '@/components/card/StatCardComposer';
import { cardMetadata } from '@/lib/pageMetadata';

/**
 * Server shell for the stat card composer, with the composer itself in the
 * client. It exists so metadata can read the query string a shared card link
 * carries: only pages receive searchParams, never layouts, and the share image
 * has to render the card the sharer built. That is also why this segment has
 * no layout.tsx.
 *
 * The network-scoped copy under /[network] re-exports this component and
 * supplies its own metadata naming that network.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  return cardMetadata(await searchParams);
}

function ComposerFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="h-96 animate-pulse rounded-lg bg-[#26282e]" />
      <div className="aspect-[1200/630] animate-pulse rounded-lg bg-[#26282e]" />
    </div>
  );
}

export default function CardPage() {
  return (
    <div className="container mx-auto max-w-[1600px] px-4 py-8">
      <header className="mb-6">
        <h1 className="mb-2 text-3xl font-windsor-bold text-white">Stat card composer</h1>
        <p className="max-w-2xl text-sm text-bodyText">
          Build a shareable card from live blob data. Every choice lands in the URL, so the link
          reproduces the card and unfurls as it on social sites.
        </p>
      </header>

      {/* StatCardComposer reads the card's query string via useSearchParams. */}
      <Suspense fallback={<ComposerFallback />}>
        <StatCardComposer />
      </Suspense>
    </div>
  );
}
