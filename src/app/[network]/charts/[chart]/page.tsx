import type { Metadata } from 'next';
import { chartMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';
import { rangeFromSearchParams, type SearchParams } from '@/lib/timeRange';

export { default } from '../../../charts/[chart]/page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ network: string; chart: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ network, chart }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return chartMetadata(chart, network, rangeFromSearchParams(resolvedSearchParams));
}
