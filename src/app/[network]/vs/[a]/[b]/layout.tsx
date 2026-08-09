import type { Metadata } from 'next';
import { unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';
import { DEFAULT_VS_RANGE } from '@/lib/vs';
import { buildVsMetadata } from '@/lib/vsSeo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; a: string; b: string }>;
}): Promise<Metadata> {
  const { network, a, b } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  // The nested /[range] layout overrides this for ranged URLs.
  return buildVsMetadata(a, b, DEFAULT_VS_RANGE, network);
}

export default function VersusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
