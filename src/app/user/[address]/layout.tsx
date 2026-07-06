import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const shortAddress =
    address.length > 14 ? `${address.slice(0, 10)}…${address.slice(-4)}` : address;
  return {
    title: `Blob Activity · ${shortAddress}`,
    alternates: {
      canonical: `/user/${address}`,
    },
  };
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
