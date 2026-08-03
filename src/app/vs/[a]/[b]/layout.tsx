import type { Metadata } from 'next';
import { humanizeEntitySlug, normalizeEntitySlug } from '@/lib/vs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}): Promise<Metadata> {
  const { a, b } = await params;
  const aName = humanizeEntitySlug(a);
  const bName = humanizeEntitySlug(b);
  const title = `${aName} vs ${bName}: Blob Battle`;
  const description =
    `Head-to-head Ethereum blobspace battle between ${aName} and ${bName}: ` +
    'blobs posted, blobspace share, ETH spent, and cost per blob and per MB.';

  // The og:image and twitter:image tags come from the sibling
  // opengraph-image.tsx via the file convention.
  return {
    title,
    description,
    alternates: {
      canonical: `/vs/${normalizeEntitySlug(a)}/${normalizeEntitySlug(b)}`,
    },
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function VersusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
