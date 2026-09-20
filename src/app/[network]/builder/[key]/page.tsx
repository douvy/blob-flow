import type { Metadata } from 'next';
import { decodeBuilderKeyParam } from '@/lib/builders';
import { builderMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../builder/[key]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; key: string }>;
}): Promise<Metadata> {
  const { network, key } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return builderMetadata(decodeBuilderKeyParam(key), network);
}
