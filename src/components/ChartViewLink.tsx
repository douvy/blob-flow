"use client";

import React from 'react';
import NetworkLink from '@/components/NetworkLink';
import { useTimeRange } from '@/contexts/TimeRangeContext';
import { buildChartViewHref } from '@/lib/chartViewUrl';

type ChartViewLinkProps = Omit<React.ComponentProps<typeof NetworkLink>, 'href'> & {
  href: string;
};

/**
 * Internal link between chart views (dashboard and /charts pages) that writes
 * the resolved ?range= into the destination, so navigating keeps the selected
 * view and copying the link reproduces it exactly. Built from state rather
 * than the current URL, which may carry no param or a value the app fell back
 * from. Wraps NetworkLink, which scopes the path to the current network.
 */
export default function ChartViewLink({ href, ...props }: ChartViewLinkProps) {
  const { timeRange } = useTimeRange();
  return <NetworkLink href={buildChartViewHref(href, timeRange)} {...props} />;
}
