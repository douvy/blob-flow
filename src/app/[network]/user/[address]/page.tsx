import type { Metadata } from 'next';
import { userMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../user/[address]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; address: string }>;
}): Promise<Metadata> {
  const { network, address } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return userMetadata(address, network);
}
