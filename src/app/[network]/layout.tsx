import { notFound } from 'next/navigation';
import { isServedNetwork } from '@/lib/serverNetworks';

/**
 * Every page under this segment shows one network, named in the URL
 * (`/sepolia/blocks`). The default network keeps the bare paths, so both trees
 * render the same pages; only the network they read differs.
 *
 * The segment is validated here rather than in the browser because any single
 * path segment matches it: `/anything` would otherwise render the dashboard,
 * with a 200 and an indexable title, against a network that does not exist.
 */
export default async function NetworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  if (!(await isServedNetwork(network))) {
    notFound();
  }

  return children;
}
