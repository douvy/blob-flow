import type { Metadata } from 'next';
import { entityMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../entity/[entity]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; entity: string }>;
}): Promise<Metadata> {
  const { network, entity } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return entityMetadata(entity, network);
}
