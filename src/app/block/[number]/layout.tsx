import type { Metadata } from 'next';
import { blockMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return blockMetadata(number);
}

export default function BlockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
