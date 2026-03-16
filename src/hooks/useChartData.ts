"use client";

import { useMemo } from 'react';
import { useApiData } from './useApiData';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useNetwork } from './useNetwork';
import { api } from '../lib/api';
import { aggregateChartData } from '../lib/chartAggregation';
import type { BlobResponse, ChartDataset, StatsResponse } from '../types';

function getLimitForRange(range: string): number {
  switch (range) {
    case '24h': return 200;
    case '7d': return 500;
    case '30d': return 1000;
    case 'All': return 1000;
    default: return 200;
  }
}

export function useChartData() {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();

  const limit = getLimitForRange(timeRange);

  const {
    data: rawBlobs,
    isLoading: blobsLoading,
    error: blobsError,
    refetch: refetchBlobs,
  } = useApiData<BlobResponse[]>(
    () => api.getRawBlobs(limit, selectedNetwork.apiParam)
  );

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useApiData<StatsResponse>(
    () => api.getStats(selectedNetwork.apiParam)
  );

  const chartData: ChartDataset | null = useMemo(() => {
    if (!rawBlobs || rawBlobs.length === 0) return null;
    const data = aggregateChartData(rawBlobs, timeRange);
    if (stats) {
      data.indicators.pendingBlobCount = stats.data.pendingBlobsCount;
    }
    return data;
  }, [rawBlobs, timeRange, stats]);

  return {
    chartData,
    isLoading: blobsLoading || statsLoading,
    error: blobsError || statsError,
    refetch: refetchBlobs,
    timeRange,
    dataPoints: rawBlobs?.length ?? 0,
  };
}
