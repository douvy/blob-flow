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
  blobTips: [],
  blobTipSeries: [],
  blobTipSummary: null,
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
  blobTipsCoverageLabel: 'tip coverage',
};

const blobTipSummary: NonNullable<ChartDataset['blobTipSummary']> = {
  totalBlobs: 20,
  pricedBlobs: 15,
  averageGwei: 2.2,
  medianGwei: 1,
  p95Gwei: 5,
  maxGwei: 5.5,
  shares: [
    { key: 'arbitrum', name: 'Arbitrum', category: 'rollup', blobCount: 10, blobSharePercent: 66.67, averageGwei: 0.5, maxGwei: 1 },
    { key: 'optimism', name: 'Optimism', category: 'rollup', blobCount: 5, blobSharePercent: 33.33, averageGwei: 4.5, maxGwei: 5.5 },
  ],
};

const selectedWindow: NonNullable<ChartDataset['selectedWindow']> = {
  window: '1h',
  label: 'Last hour',
  durationSeconds: 3600,
  startTimestamp: 1_754_000_000,
  endTimestamp: 1_754_003_600,
  averageBaseFeeGwei: 12.3456,
  medianBaseFeeGwei: 11,
  p95BaseFeeGwei: 20,
  totalBlobs: 1234,
  totalBlobGasUsed: 161_712_128,
  averageUtilizationPct: 87.65,
  totalCostEth: 0.4567891,
  uniqueSenders: 42,
};

describe('chartViews', () => {
  it('summarizes each view with a rolling-window headline stat', () => {
    const withWindow = { ...chartData, selectedWindow, blobTipSummary };
    const stats = Object.fromEntries(
      CHART_VIEWS.map((view) => [view.id, view.getHeadlineStat(withWindow)])
    );

    expect(stats).toEqual({
      'base-fee': 'avg base fee 12.3456 Gwei',
      'gas-utilization': 'avg utilization 87.7%',
      'blob-usage': '1,234 blobs posted',
      'blob-share': '1,234 blobs across 42 senders',
      'cost-comparison': '0.4568 ETH spent on blobs',
      'blob-tips': 'avg tip 2.2 Gwei, Optimism bid highest at 4.5 Gwei',
      'tip-spread': 'median tip 1 Gwei, max 5.5 Gwei',
      'rolling-market-stats': '1,234 blobs from 42 senders',
    });
  });

  it('returns no headline stat when the rolling window is absent', () => {
    for (const view of CHART_VIEWS) {
      expect(view.getHeadlineStat(chartData)).toBeNull();
    }
  });

  it('quotes only the average tip when a single sender posted blobs', () => {
    const view = CHART_VIEWS.find((entry) => entry.id === 'blob-tips');
    if (!view) throw new Error('no blob-tips view');
    const single = {
      ...chartData,
      blobTipSummary: { ...blobTipSummary, shares: blobTipSummary.shares.slice(0, 1) },
    };

    expect(view.getHeadlineStat(single)).toBe('avg tip 2.2 Gwei');
  });

  it('returns no tip headline for a range with no priced blobs', () => {
    const unpriced = { ...chartData, blobTipSummary: { ...blobTipSummary, pricedBlobs: 0 } };
    for (const id of ['blob-tips', 'tip-spread']) {
      const view = CHART_VIEWS.find((entry) => entry.id === id);
      if (!view) throw new Error(`no chart view ${id}`);
      expect(view.getHeadlineStat(unpriced)).toBeNull();
    }
  });

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
      'blob-tips': 'tip coverage',
      'tip-spread': 'tip coverage',
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
