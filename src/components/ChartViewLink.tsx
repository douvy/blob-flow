"use client";

import React from 'react';
import Link from 'next/link';
import { useTimeRange } from '@/contexts/TimeRangeContext';
import { useNetwork } from '@/hooks/useNetwork';
import { buildChartViewHref } from '@/lib/chartViewUrl';

type ChartViewLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

/**
 * Internal link between chart views (dashboard and /charts pages) that writes
 * the resolved ?range= and ?network= into the destination, so navigating
 * keeps the selected view and copying the link reproduces it exactly. Built
 * from state rather than the current URL, which may lack params (selection
 * from localStorage) or carry values the app fell back from.
 */
export default function ChartViewLink({ href, ...props }: ChartViewLinkProps) {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  return (
    <Link
      href={buildChartViewHref(href, { range: timeRange, network: selectedNetwork.apiParam })}
      {...props}
    />
  );
}
