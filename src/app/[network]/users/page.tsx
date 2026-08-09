import type { Metadata } from 'next';
import { unknownNetworkMetadata, usersMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../users/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string }>;
}): Promise<Metadata> {
  const { network } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return usersMetadata(network);
}
