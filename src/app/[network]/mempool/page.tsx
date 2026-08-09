import type { Metadata } from 'next';
import { mempoolMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../mempool/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string }>;
}): Promise<Metadata> {
  const { network } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return mempoolMetadata(network);
}
