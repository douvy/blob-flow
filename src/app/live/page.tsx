import { Suspense } from 'react';
import type { Metadata } from 'next';
import LiveKiosk from '@/components/live/LiveKiosk';
import KioskSkeleton from '@/components/live/KioskSkeleton';

export const metadata: Metadata = {
  title: 'TV Mode: Live Blob Market',
  description:
    'Full-screen live view of the Ethereum blob market: current blob base fee, next-block ' +
    'prediction, blobspace fullness, and the rollups filling recent blocks. Built for ' +
    'conference screens and stream overlays.',
  alternates: {
    canonical: '/live',
  },
};

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
