import type { Metadata } from 'next';
import { recordsMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = recordsMetadata();

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
