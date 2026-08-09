import type { Metadata } from 'next';
import { parseVsRange } from '@/lib/vs';
import { buildVsMetadata } from '@/lib/vsSeo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string; range: string }>;
}): Promise<Metadata> {
  const { a, b, range } = await params;
  return buildVsMetadata(a, b, parseVsRange(range));
}

export default function VersusRangeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
