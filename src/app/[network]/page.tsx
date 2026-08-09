import type { Metadata } from 'next';
import { homeMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ network: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ network }, query] = await Promise.all([params, searchParams]);
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  const range = Array.isArray(query.range) ? query.range[0] : query.range;

  return homeMetadata(network, range);
}
