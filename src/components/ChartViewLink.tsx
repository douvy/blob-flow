"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { appendChartViewParams } from '@/lib/chartViewUrl';

type ChartViewLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

function ChartViewLinkWithParams({ href, ...props }: ChartViewLinkProps) {
  const searchParams = useSearchParams();
  return <Link href={appendChartViewParams(href, searchParams.toString())} {...props} />;
}

/**
 * Internal link between chart views (dashboard and /charts pages) that carries
 * the current ?range= and ?network= params, so navigating keeps the selected
 * view. useSearchParams requires a Suspense boundary in Next 15 client
 * components; the fallback renders the same link without params while the
 * params resolve during prerendering.
 */
export default function ChartViewLink({ href, ...props }: ChartViewLinkProps) {
  return (
    <Suspense fallback={<Link href={href} {...props} />}>
      <ChartViewLinkWithParams href={href} {...props} />
    </Suspense>
  );
}
