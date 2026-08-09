import type { Metadata } from 'next';
import { chartMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../../charts/[chart]/page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ network: string; chart: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ network, chart }, query] = await Promise.all([params, searchParams]);
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  // The share card follows the range from the link, same as the bare route.
  const range = Array.isArray(query.range) ? query.range[0] : query.range;

  return chartMetadata(chart, network, range);
}
