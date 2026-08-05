import type { Metadata } from 'next';
import { mempoolMetadata } from '@/lib/pageMetadata';

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = mempoolMetadata();

export default function MempoolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
