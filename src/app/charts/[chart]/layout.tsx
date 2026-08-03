import type { Metadata } from 'next';
import { CHART_PAGES } from '@/constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chart: string }>;
}): Promise<Metadata> {
  const { chart } = await params;
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  const title = page?.title ?? 'Charts';
  const description = page?.description;

  // og:image and twitter:image come from the generated opengraph-image.tsx
  // in this segment; listing them here would override the generated URL.
  return {
    title,
    description,
    alternates: {
      canonical: `/charts/${chart}`,
    },
    openGraph: {
      type: 'website',
      siteName: 'BlobFlow',
      title,
      description,
      url: `/charts/${chart}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
