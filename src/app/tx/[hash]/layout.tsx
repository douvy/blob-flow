import type { Metadata } from 'next';
import { transactionMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  return transactionMetadata(hash);
}

export default function TransactionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
