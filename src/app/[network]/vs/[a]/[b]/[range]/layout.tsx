import type { Metadata } from 'next';
import { unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';
import { parseVsRange } from '@/lib/vs';
import { buildVsMetadata } from '@/lib/vsSeo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; a: string; b: string; range: string }>;
}): Promise<Metadata> {
  const { network, a, b, range } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return buildVsMetadata(a, b, parseVsRange(range), network);
}

export default function VersusRangeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
