import type { Metadata } from 'next';
import { cardMetadata, unknownNetworkMetadata } from '@/lib/pageMetadata';
import { isServedNetwork } from '@/lib/serverNetworks';

export { default } from '../../card/page';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ network: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ network }, query] = await Promise.all([params, searchParams]);
  if (!(await isServedNetwork(network))) return unknownNetworkMetadata();

  // The share image follows the card in the link, same as the bare route.
  return cardMetadata(query, network);
}
