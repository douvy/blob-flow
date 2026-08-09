import { Suspense } from 'react';
import type { Metadata } from 'next';
import ChartDetailView from '@/components/charts/ChartDetailView';
import { chartMetadata } from '@/lib/pageMetadata';

/**
 * Server shell for the chart detail page, with the chart UI itself in the
 * client ChartDetailView. It exists so metadata can read the ?range= a share
 * link carries: only pages receive searchParams, never layouts, and the share
 * card has to render the range the sharer was viewing. That is also why this
 * segment has no layout.tsx.
 *
 * The network-scoped copy under /[network] re-exports this component and
 * supplies its own metadata naming that network.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ chart: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [{ chart }, query] = await Promise.all([params, searchParams]);
  const range = Array.isArray(query.range) ? query.range[0] : query.range;

  return chartMetadata(chart, undefined, range);
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
