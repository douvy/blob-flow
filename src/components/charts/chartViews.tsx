"use client";

import React from 'react';
import type { ChartDataset } from '../../types';
import BaseFeeChart from './BaseFeeChart';
import CostComparisonChart from './CostComparisonChart';
import GasUtilizationChart from './GasUtilizationChart';
import L2UsageChart from './L2UsageChart';
import RollingWindowStats from './RollingWindowStats';

export const CHART_VIEW_IDS = [
  'base-fee',
  'gas-utilization',
  'l2-usage',
  'cost-comparison',
  'rolling-market-stats',
] as const;

export type ChartViewId = (typeof CHART_VIEW_IDS)[number];

export interface ChartView {
  id: ChartViewId;
  title: string;
  shortTitle: string;
  description: string;
  dashboardFrameClassName: string;
  detailFrameClassName: string;
  getTitle: (chartData: ChartDataset) => string;
  getPointCount: (chartData: ChartDataset) => number;
  render: (chartData: ChartDataset) => React.ReactNode;
}

export const CHART_VIEWS: readonly ChartView[] = [
  {
    id: 'base-fee',
    title: 'Base Fee over Recent Blocks (Gwei)',
    shortTitle: 'Base Fee',
    description: 'Blob base fee trend across the most recent indexed blocks.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Base Fee over ${chartData.chartRangeLabel} (Gwei)`,
    getPointCount: (chartData) => chartData.baseFee.length,
    render: (chartData) => (
      <BaseFeeChart
        data={chartData.baseFee}
        referenceBaseFeeGwei={chartData.selectedWindow?.averageBaseFeeGwei}
      />
    ),
  },
  {
    id: 'gas-utilization',
    title: 'Blob Gas Utilization vs Current Target',
    shortTitle: 'Gas Utilization',
    description: 'Blob gas used per block against the current target.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob Gas Utilization over ${chartData.chartRangeLabel}`,
    getPointCount: (chartData) => chartData.gasUtilization.length,
    render: (chartData) => (
      <GasUtilizationChart
        data={chartData.gasUtilization}
        averageUtilizationPct={chartData.selectedWindow?.averageUtilizationPct}
      />
    ),
  },
  {
    id: 'l2-usage',
    title: 'L2 Usage by Attribution',
    shortTitle: 'L2 Usage',
    description: 'Bucketed blob usage grouped by known rollup or sender attribution.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `L2 Usage over ${chartData.chartRangeLabel}`,
    getPointCount: (chartData) => chartData.l2Usage.length,
    render: (chartData) => (
      <L2UsageChart
        data={chartData.l2Usage}
        series={chartData.l2UsageSeries}
      />
    ),
  },
  {
    id: 'cost-comparison',
    title: 'Blob vs Calldata Cost',
    shortTitle: 'Cost Savings',
    description: 'Blob cost compared with calldata-equivalent cost approximation.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob vs Calldata Cost over ${chartData.chartRangeLabel}`,
    getPointCount: (chartData) => chartData.costComparison.length,
    render: (chartData) => (
      <CostComparisonChart data={chartData.costComparison} />
    ),
  },
  {
    id: 'rolling-market-stats',
    title: 'Rolling Market Stats',
    shortTitle: 'Rolling Stats',
    description: 'Windowed fee, utilization, cost, and sender totals.',
    dashboardFrameClassName: 'relative',
    detailFrameClassName: 'relative',
    getTitle: () => 'Rolling Market Stats',
    getPointCount: (chartData) => chartData.rollingWindows.length,
    render: (chartData) => (
      <RollingWindowStats
        windows={chartData.rollingWindows}
        selectedWindow={chartData.selectedWindow}
      />
    ),
  },
];

export function getChartView(chartId: string | undefined): ChartView | null {
  return CHART_VIEWS.find((view) => view.id === chartId) ?? null;
}
