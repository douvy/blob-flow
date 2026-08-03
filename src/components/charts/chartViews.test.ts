import { CHART_VIEWS } from './chartViews';
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
    const withWindow = { ...chartData, selectedWindow };
    const stats = Object.fromEntries(
      CHART_VIEWS.map((view) => [view.id, view.getHeadlineStat(withWindow)])
    );

    expect(stats).toEqual({
      'base-fee': 'avg base fee 12.3456 Gwei',
      'gas-utilization': 'avg utilization 87.7%',
      'blob-usage': '1,234 blobs posted',
      'cost-comparison': '0.4568 ETH spent on blobs',
      'rolling-market-stats': '1,234 blobs from 42 senders',
    });
  });

  it('returns no headline stat when the rolling window is absent', () => {
    for (const view of CHART_VIEWS) {
      expect(view.getHeadlineStat(chartData)).toBeNull();
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
      'cost-comparison': 'cost comparison coverage',
      'rolling-market-stats': 'rolling coverage',
    });
  });
});
