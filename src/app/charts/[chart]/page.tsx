import { Suspense } from 'react';
import type { Metadata } from 'next';
import ChartDetailView from '@/components/charts/ChartDetailView';
import { CHART_PAGES, SITE_NAME, parseTimeRange } from '@/constants';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';

/**
 * Server shell for the chart detail page. It exists so metadata can read the
 * ?range= a share link carries: only pages receive searchParams, and the
 * chart UI itself is client-side.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ chart: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ chart }, query] = await Promise.all([params, searchParams]);
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  const title = page?.title ?? 'Charts';
  const description = page?.description;

  const rawRange = Array.isArray(query.range) ? query.range[0] : query.range;
  const range = parseTimeRange(rawRange, OG_CARD_DEFAULT_RANGE);
  const cardUrl = `/api/og/chart/${chart}?range=${range}`;
  const cardAlt = `${title} over the last ${range} on ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      // Ranges are a view of one chart, not separate pages, so they all
      // canonicalize to the bare chart URL.
      canonical: `/charts/${chart}`,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: `/charts/${chart}`,
      images: [{ url: cardUrl, width: 1200, height: 630, alt: cardAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: cardUrl, alt: cardAlt }],
    },
  };
}

export default async function ChartDetailPage({
  params,
}: {
  params: Promise<{ chart: string }>;
}) {
  const { chart } = await params;

  // ChartDetailView reads the ?range= deep link via useSearchParams.
  return (
    <Suspense fallback={null}>
      <ChartDetailView chartId={chart} />
    </Suspense>
  );
}
