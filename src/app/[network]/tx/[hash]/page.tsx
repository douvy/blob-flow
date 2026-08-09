import type { Metadata } from 'next';
import { transactionMetadata } from '@/lib/pageMetadata';

export { default } from '../../../tx/[hash]/page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ network: string; hash: string }>;
}): Promise<Metadata> {
  const { network, hash } = await params;
  return transactionMetadata(hash, network);
}
