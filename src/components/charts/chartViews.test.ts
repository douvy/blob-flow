import type { ReactElement } from 'react';
import { CHART_VIEWS } from './chartViews';
import { CHART_PAGES } from '../../constants';
import type { ChartDataset } from '../../types';

const chartData: ChartDataset = {
  baseFee: [],
  gasUtilization: [],
  blobUsage: [],
  blobUsageSeries: [],
  costComparison: [],
  rollingWindows: [],
  selectedWindow: null,
  indicators: {
    currentBaseFeeGwei: 0,
    averageBaseFeeGwei: 0,
    feeRatio: 1,
    pendingBlobCount: 0,
    recentBaseFeeSparkline: [],
  },
  granularity: 'minute',
  recentBlockCount: 0,
  chartRangeLabel: '1h view',
  coverageLabel: 'combined coverage',
  rollingCoverageLabel: 'rolling coverage',
  blockCoverageLabel: 'market coverage',
  blobUsageCoverageLabel: 'blob usage coverage',
  costComparisonCoverageLabel: 'cost comparison coverage',
};

describe('chartViews', () => {
  it('captions each view with the coverage label for the data it plots', () => {
    const labels = Object.fromEntries(
      CHART_VIEWS.map((view) => [view.id, view.getCoverageLabel(chartData)])
    );

    expect(labels).toEqual({
      'base-fee': 'market coverage',
      'gas-utilization': 'market coverage',
      'blob-usage': 'blob usage coverage',
      'blob-share': 'blob usage coverage',
      'cost-comparison': 'cost comparison coverage',
      'rolling-market-stats': 'rolling coverage',
    });
  });

  // CHART_PAGES drives the sitemap and per-chart metadata, but it can't import
  // this "use client" module, so the two lists are kept in sync by hand.
  it('has a CHART_PAGES entry for every view', () => {
    expect(CHART_PAGES.map((page) => page.slug)).toEqual(
      CHART_VIEWS.map((view) => view.id)
    );
  });

  // Both views plot the same attribution data through BlobUsageChart, so only
  // the variant tells them apart: without it, blob-share silently duplicates
  // blob-usage.
  it('plots blob-share as shares and blob-usage as counts', () => {
    const variantOf = (id: string) => {
      const view = CHART_VIEWS.find((entry) => entry.id === id);
      if (!view) throw new Error(`no chart view ${id}`);
      const element = view.render(chartData) as ReactElement<{ variant?: string }>;
      return element.props.variant;
    };

    expect(variantOf('blob-share')).toBe('share');
    expect(variantOf('blob-usage')).toBeUndefined();
  });
});
