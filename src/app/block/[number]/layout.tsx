import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Block ${number} Blob Details`,
    alternates: {
      canonical: `/block/${number}`,
    },
  };
}

export default function BlockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
