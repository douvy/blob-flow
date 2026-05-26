"use client";

import React from 'react';
import type { ChartDataset } from '../../types';
import BaseFeeChart from './BaseFeeChart';
import GasUtilizationChart from './GasUtilizationChart';
import RollingWindowStats from './RollingWindowStats';

export const CHART_VIEW_IDS = [
  'base-fee',
  'gas-utilization',
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
