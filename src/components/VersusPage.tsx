"use client";

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VersusBattleCard from '@/components/VersusBattleCard';
import { parseVsRange } from '@/lib/vs';

function VersusPageInner() {
  // The range segment only exists on the /vs/[a]/[b]/[range] route; the bare
  // matchup route leaves it undefined and shows the default window.
  const params = useParams<{ a: string; b: string; range?: string }>();
  const searchParams = useSearchParams();
  // Older shared links carried ?range=; keep honoring them as a fallback.
  const range = parseVsRange(params.range ?? searchParams.get('range'));

  return <VersusBattleCard aSlug={params.a ?? ''} bSlug={params.b ?? ''} range={range} />;
}

/** Shared client page for both vs routes (with and without a range segment). */
export default function VersusPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <VersusPageInner />
    </Suspense>
  );
}
