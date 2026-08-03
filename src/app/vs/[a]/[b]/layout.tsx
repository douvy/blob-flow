import type { Metadata } from 'next';
import { DEFAULT_VS_RANGE } from '@/lib/vs';
import { buildVsMetadata } from '@/lib/vsSeo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}): Promise<Metadata> {
  const { a, b } = await params;
  // The nested /[range] layout overrides this for ranged URLs.
  return buildVsMetadata(a, b, DEFAULT_VS_RANGE);
}

export default function VersusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
