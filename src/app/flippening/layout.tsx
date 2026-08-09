import type { Metadata } from 'next';
import { flippeningMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = flippeningMetadata();

export default function FlippeningLayout({ children }: { children: React.ReactNode }) {
  return children;
}
