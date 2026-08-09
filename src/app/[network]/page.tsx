import type { Metadata } from 'next';
import { homeMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';
import { rangeFromSearchParams, type SearchParams } from '@/lib/timeRange';

export { default } from '../page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ network: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ network }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  return homeMetadata(network, rangeFromSearchParams(resolvedSearchParams));
}
