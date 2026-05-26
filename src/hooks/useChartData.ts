"use client";

import { useCallback, useMemo } from 'react';
import { useApiData } from './useApiData';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useNetwork } from './useNetwork';
import { api } from '../lib/api';
import { buildChartDataset, getPricingBlockRequestLimit } from '../lib/chartAggregation';
import type {
  BackendStatsWindowsResponse,
  BlobPricing,
  ChartDataset,
  StatsResponse,
} from '../types';

export function useChartData() {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const pricingBlockLimit = getPricingBlockRequestLimit(timeRange);
  const pricingRefetchKey = `${network ?? 'default'}:${pricingBlockLimit}`;

  const fetchPricing = useCallback(
    () => api.getBlobPricing(network, pricingBlockLimit),
    [network, pricingBlockLimit]
  );

  const fetchStatsWindows = useCallback(
    () => api.getStatsWindows(undefined, network),
    [network]
  );

  const fetchStats = useCallback(
    () => api.getStats(network),
    [network]
  );

  const {
    data: pricing,
    isLoading: pricingLoading,
    error: pricingError,
    refetch: refetchPricing,
  } = useApiData<BlobPricing>(fetchPricing, undefined, pricingRefetchKey);

  const {
    data: statsWindows,
    isLoading: windowsLoading,
    error: windowsError,
    refetch: refetchStatsWindows,
  } = useApiData<BackendStatsWindowsResponse>(fetchStatsWindows, undefined, network);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiData<StatsResponse>(fetchStats, undefined, network);

  const chartData: ChartDataset | null = useMemo(() => {
    if (!pricing || !statsWindows) return null;
    return buildChartDataset(statsWindows, pricing, timeRange, stats?.data);
  }, [pricing, statsWindows, timeRange, stats]);

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchPricing(),
      refetchStatsWindows(),
      refetchStats(),
    ]);
  }, [refetchPricing, refetchStatsWindows, refetchStats]);

  return {
    chartData,
    isLoading: pricingLoading || windowsLoading || statsLoading,
    error: pricingError || windowsError || statsError,
    refetch,
    timeRange,
    dataPoints: chartData?.recentBlockCount ?? 0,
  };
}
