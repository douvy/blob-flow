import type { Metadata } from 'next';
import { CHART_PAGES } from '@/constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chart: string }>;
}): Promise<Metadata> {
  const { chart } = await params;
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  return {
    title: page?.title ?? 'Charts',
    alternates: {
      canonical: `/charts/${chart}`,
    },
  };
}

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
