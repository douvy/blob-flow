import type { Metadata } from 'next';
import { chartMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chart: string }>;
}): Promise<Metadata> {
  const { chart } = await params;
  return chartMetadata(chart);
}

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
