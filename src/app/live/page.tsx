import { Suspense } from 'react';
import type { Metadata } from 'next';
import LiveKiosk from '@/components/live/LiveKiosk';
import KioskSkeleton from '@/components/live/KioskSkeleton';
import { liveMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = liveMetadata();

export default function LivePage() {
  // Suspense so the statically prerendered shell can read the ?focus rollup
  // param on the client (useSearchParams requires a boundary). The fallback
  // is the real kiosk shell, so the prerendered HTML is the dark canvas a
  // viewer expects rather than a blank page until hydration.
  return (
    <Suspense fallback={<KioskSkeleton />}>
      <LiveKiosk />
    </Suspense>
  );
}
