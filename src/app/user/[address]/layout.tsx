import type { Metadata } from 'next';
import { userMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  return userMetadata(address);
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
