"use client";

import { useCallback, useMemo } from 'react';
import { useApiData } from './useApiData';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useNetwork } from './useNetwork';
import { api } from '../lib/api';
import { buildChartDatasetFromResponses, getBackendChartRange } from '../lib/chartAggregation';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartResponse,
  BackendBlobTipsChartResponse,
  BackendCostComparisonChartResponse,
  BackendStatsWindowsResponse,
  ChartDataset,
  StatsResponse,
} from '../types';

export function useChartData() {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const backendRange = getBackendChartRange(timeRange);

  const fetchMarket = useCallback(
    () => api.getBlobMarketChart(backendRange, network),
    [backendRange, network]
  );

  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(backendRange, network),
    [backendRange, network]
  );

  const fetchCostComparison = useCallback(
    () => api.getCostComparisonChart(backendRange, network),
    [backendRange, network]
  );

  const fetchBlobTips = useCallback(
    () => api.getBlobTipsChart(backendRange, network),
    [backendRange, network]
  );

  const fetchRollingStats = useCallback(
    () => api.getRollingStatsChart(undefined, network),
    [network]
  );

  const fetchStats = useCallback(
    () => api.getStats(network),
    [network]
  );

  const {
    data: market,
    isLoading: marketLoading,
    error: marketError,
    refetch: refetchMarket,
  } = useApiData<BackendBlobMarketChartResponse>(fetchMarket, ['chart-market', network, backendRange]);

  const {
    data: attribution,
    isLoading: attributionLoading,
    error: attributionError,
    refetch: refetchAttribution,
  } = useApiData<BackendAttributionUsageChartResponse>(fetchAttribution, ['chart-attribution', network, backendRange]);

  const {
    data: costComparison,
    isLoading: costComparisonLoading,
    error: costComparisonError,
    refetch: refetchCostComparison,
  } = useApiData<BackendCostComparisonChartResponse>(fetchCostComparison, ['chart-cost-comparison', network, backendRange]);

  // Tips are optional: a backend without /charts/blob-tips must not take the
  // whole dashboard down, so its error is reported on its own and the tip
  // views render an empty state instead.
  const {
    data: blobTips,
    isLoading: blobTipsLoading,
    error: blobTipsError,
    refetch: refetchBlobTips,
  } = useApiData<BackendBlobTipsChartResponse>(fetchBlobTips, ['chart-blob-tips', network, backendRange]);

  const {
    data: rollingStats,
    refetch: refetchRollingStats,
  } = useApiData<BackendStatsWindowsResponse>(fetchRollingStats, ['chart-rolling-stats', network]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiData<StatsResponse>(fetchStats, ['stats', network]);

  const chartData: ChartDataset | null = useMemo(() => {
    if (!market || !attribution || !costComparison) return null;
    return buildChartDatasetFromResponses(
      market,
      attribution,
      costComparison,
      timeRange,
      stats?.data,
      rollingStats,
      blobTips
    );
  }, [market, attribution, costComparison, timeRange, stats, rollingStats, blobTips]);

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchMarket(),
      refetchAttribution(),
      refetchCostComparison(),
      refetchBlobTips(),
      refetchRollingStats(),
      refetchStats(),
    ]);
  }, [refetchMarket, refetchAttribution, refetchCostComparison, refetchBlobTips, refetchRollingStats, refetchStats]);

  return {
    chartData,
    isLoading: marketLoading || attributionLoading || costComparisonLoading || statsLoading,
    error: marketError || attributionError || costComparisonError || statsError,
    blobTipsLoading,
    blobTipsError,
    refetch,
    timeRange,
    dataPoints: chartData?.recentBlockCount ?? 0,
  };
}
