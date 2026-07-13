import { CHART_VIEWS } from './chartViews';
import type { ChartDataset } from '../../types';

const chartData: ChartDataset = {
  baseFee: [],
  gasUtilization: [],
  l2Usage: [],
  l2UsageSeries: [],
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
  l2UsageCoverageLabel: 'l2 usage coverage',
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
      'l2-usage': 'l2 usage coverage',
      'cost-comparison': 'cost comparison coverage',
      'rolling-market-stats': 'rolling coverage',
    });
  });
});
