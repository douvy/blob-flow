"use client";

import React from 'react';
import type { ChartDataset } from '../../types';
import { formatGwei, formatNumber } from '../../utils';
import BaseFeeChart from './BaseFeeChart';
import CostComparisonChart from './CostComparisonChart';
import GasUtilizationChart from './GasUtilizationChart';
import BlobUsageChart from './BlobUsageChart';
import BlobTipsChart from './BlobTipsChart';
import TipSpreadChart from './TipSpreadChart';
import RollingWindowStats from './RollingWindowStats';

export const CHART_VIEW_IDS = [
  'base-fee',
  'gas-utilization',
  'blob-usage',
  'blob-share',
  'cost-comparison',
  'blob-tips',
  'tip-spread',
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
  /** Headline stat for share copy; null when the rolling window is absent. */
  getHeadlineStat: (chartData: ChartDataset) => string | null;
  /** Coverage caption matching the data this view plots (see getPointCount). */
  getCoverageLabel: (chartData: ChartDataset) => string;
  getPointCount: (chartData: ChartDataset) => number;
  render: (chartData: ChartDataset) => React.ReactNode;
}

/** Matches the precision RollingWindowStats uses for windowed ETH totals. */
function formatEthStat(value: number): string {
  if (value < 0.001) return value.toFixed(6);
  return value.toFixed(4);
}

/**
 * Headline for the tip views: the range's average tip and, when one sender
 * bid above the rest, who it was. Null until the tips endpoint has answered,
 * and for a range with no priced blobs, where there is nothing to quote.
 */
function formatTipHeadline(chartData: ChartDataset): string | null {
  const summary = chartData.blobTipSummary;
  if (!summary || summary.pricedBlobs === 0) return null;
  const topBidder = [...summary.shares]
    .filter((share) => share.blobCount > 0)
    .sort((a, b) => b.averageGwei - a.averageGwei)[0];
  const headline = `avg tip ${formatGwei(summary.averageGwei, 4)}`;
  if (!topBidder || summary.shares.length < 2) return headline;
  return `${headline}, ${topBidder.name} bid highest at ${formatGwei(topBidder.averageGwei, 4)}`;
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
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `avg base fee ${formatGwei(chartData.selectedWindow.averageBaseFeeGwei, 4)}`
        : null,
    getCoverageLabel: (chartData) => chartData.blockCoverageLabel,
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
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `avg utilization ${chartData.selectedWindow.averageUtilizationPct.toFixed(1)}%`
        : null,
    getCoverageLabel: (chartData) => chartData.blockCoverageLabel,
    getPointCount: (chartData) => chartData.gasUtilization.length,
    render: (chartData) => (
      <GasUtilizationChart
        data={chartData.gasUtilization}
        averageUtilizationPct={chartData.selectedWindow?.averageUtilizationPct}
      />
    ),
  },
  {
    id: 'blob-usage',
    title: 'Blob Usage by Attribution',
    shortTitle: 'Blob Usage',
    description: 'Bucketed blob usage grouped by known rollup or sender attribution.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob Usage over ${chartData.chartRangeLabel}`,
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `${formatNumber(chartData.selectedWindow.totalBlobs)} blobs posted`
        : null,
    getCoverageLabel: (chartData) => chartData.blobUsageCoverageLabel,
    getPointCount: (chartData) => chartData.blobUsage.length,
    render: (chartData) => (
      <BlobUsageChart
        data={chartData.blobUsage}
        series={chartData.blobUsageSeries}
      />
    ),
  },
  {
    id: 'blob-share',
    title: 'Blob Share by Attribution',
    shortTitle: 'Blob Share',
    description: 'Each rollup or sender as a percentage of the blobs in every bucket.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob Share over ${chartData.chartRangeLabel}`,
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `${formatNumber(chartData.selectedWindow.totalBlobs)} blobs across ${formatNumber(chartData.selectedWindow.uniqueSenders)} senders`
        : null,
    getCoverageLabel: (chartData) => chartData.blobUsageCoverageLabel,
    getPointCount: (chartData) => chartData.blobUsage.length,
    render: (chartData) => (
      <BlobUsageChart
        data={chartData.blobUsage}
        series={chartData.blobUsageSeries}
        variant="share"
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
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `${formatEthStat(chartData.selectedWindow.totalCostEth)} ETH spent on blobs`
        : null,
    getCoverageLabel: (chartData) => chartData.costComparisonCoverageLabel,
    getPointCount: (chartData) => chartData.costComparison.length,
    render: (chartData) => (
      <CostComparisonChart data={chartData.costComparison} />
    ),
  },
  {
    id: 'blob-tips',
    title: 'Blob Tips by Attribution (Gwei)',
    shortTitle: 'Blob Tips',
    description:
      'Average priority fee each rollup or sender paid per blob transaction, the bid that decides whose blobs a builder includes.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob Tips by Attribution over ${chartData.chartRangeLabel} (Gwei)`,
    getHeadlineStat: formatTipHeadline,
    getCoverageLabel: (chartData) => chartData.blobTipsCoverageLabel,
    getPointCount: (chartData) => chartData.blobTips.length,
    render: (chartData) => (
      <BlobTipsChart data={chartData.blobTips} series={chartData.blobTipSeries} />
    ),
  },
  {
    id: 'tip-spread',
    title: 'Blob Tip Spread (Gwei)',
    shortTitle: 'Tip Spread',
    description:
      'Median, 95th percentile, and highest priority fee paid for blobs in every bucket, showing how far the top bids run above the market.',
    dashboardFrameClassName: 'h-56 relative',
    detailFrameClassName: 'h-[62vh] min-h-[360px] max-h-[720px] relative',
    getTitle: (chartData) => `Blob Tip Spread over ${chartData.chartRangeLabel} (Gwei)`,
    getHeadlineStat: (chartData) =>
      chartData.blobTipSummary && chartData.blobTipSummary.pricedBlobs > 0
        ? `median tip ${formatGwei(chartData.blobTipSummary.medianGwei, 4)}, max ${formatGwei(chartData.blobTipSummary.maxGwei, 4)}`
        : null,
    getCoverageLabel: (chartData) => chartData.blobTipsCoverageLabel,
    getPointCount: (chartData) => chartData.blobTips.length,
    render: (chartData) => <TipSpreadChart data={chartData.blobTips} />,
  },
  {
    id: 'rolling-market-stats',
    title: 'Rolling Market Stats',
    shortTitle: 'Rolling Stats',
    description: 'Windowed fee, utilization, cost, and sender totals.',
    dashboardFrameClassName: 'relative',
    detailFrameClassName: 'relative',
    getTitle: () => 'Rolling Market Stats',
    getHeadlineStat: (chartData) =>
      chartData.selectedWindow
        ? `${formatNumber(chartData.selectedWindow.totalBlobs)} blobs from ${formatNumber(chartData.selectedWindow.uniqueSenders)} senders`
        : null,
    getCoverageLabel: (chartData) => chartData.rollingCoverageLabel,
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
