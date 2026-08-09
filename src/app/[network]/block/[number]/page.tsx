import type { Metadata } from 'next';
import { blockMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../block/[number]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; number: string }>;
}): Promise<Metadata> {
  const { network, number } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return blockMetadata(number, network);
}
