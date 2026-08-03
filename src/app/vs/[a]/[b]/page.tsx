"use client";

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VersusBattleCard from '@/components/VersusBattleCard';
import { parseVsRange } from '@/lib/vs';

function VersusPageInner() {
  const params = useParams<{ a: string; b: string }>();
  const searchParams = useSearchParams();
  const range = parseVsRange(searchParams.get('range'));

  return <VersusBattleCard aSlug={params.a ?? ''} bSlug={params.b ?? ''} range={range} />;
}

export default function VersusPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <VersusPageInner />
    </Suspense>
  );
}
