import type { Metadata } from 'next';
import { blocksMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../blocks/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string }>;
}): Promise<Metadata> {
  const { network } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return blocksMetadata(network);
}
