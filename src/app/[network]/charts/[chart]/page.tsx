import type { Metadata } from 'next';
import { chartMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../charts/[chart]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; chart: string }>;
}): Promise<Metadata> {
  const { network, chart } = await params;
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return chartMetadata(chart, network);
}
