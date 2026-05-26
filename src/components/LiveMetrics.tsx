"use client";

import React, { useCallback, useMemo } from 'react';
import MetricCard from './MetricCard';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { selectRollingWindow, transformStatsWindows } from '../lib/chartAggregation';
import { transformStatsResponse } from '../lib/api/stats';
import { BackendStatsWindowsResponse, RollingWindowDataPoint, StatsResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatGwei(value: number): string {
  if (value === 0) return '0 Gwei';
  if (value < 0.01) return `${value.toFixed(4)} Gwei`;
  return `${value.toFixed(2)} Gwei`;
}

function formatEth(value: number): string {
  if (value === 0) return '0 ETH';
  if (value < 0.000001) return `${value.toExponential(1)} ETH`;
  if (value < 0.001) return `${value.toFixed(6)} ETH`;
  return `${value.toFixed(4)} ETH`;
}

export default function LiveMetrics() {
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const statsUpdateEvent = useLatestBlobEvent('stats_update');
  const network = selectedNetwork.apiParam;

  const fetchStats = useCallback(
    () => api.getStats(network),
    [network]
  );

  const fetchStatsWindows = useCallback(
    () => api.getStatsWindows(undefined, network),
    [network]
  );

  const {
    data,
    isLoading: statsLoading,
    error: statsError,
  } = useApiData<StatsResponse>(fetchStats, undefined, network);

  const {
    data: statsWindows,
    isLoading: windowsLoading,
    error: windowsError,
  } = useApiData<BackendStatsWindowsResponse>(fetchStatsWindows, undefined, network);

  const rollingWindows = useMemo(
    () => (statsWindows ? transformStatsWindows(statsWindows) : []),
    [statsWindows]
  );

  const selectedWindow = useMemo(
    () => selectRollingWindow(rollingWindows, timeRange),
    [rollingWindows, timeRange]
  );

  const liveStatsData = statsUpdateEvent
    ? transformStatsResponse(statsUpdateEvent.data)
    : undefined;
  const displayData = liveStatsData || data;

  const getMetricsFromData = (
    statsData: StatsResponse,
    window: RollingWindowDataPoint
  ) => {
    const stats = statsData.data;

    return [
      {
        title: 'Avg Base Fee',
        value: formatGwei(window.averageBaseFeeGwei),
        trend: 'neutral' as const,
        description: `Median ${formatGwei(window.medianBaseFeeGwei)} / p95 ${formatGwei(window.p95BaseFeeGwei)}`,
        icon: 'fa-regular fa-money-bills'
      },
      {
        title: 'Rolling Blobs',
        value: formatCompactNumber(window.totalBlobs),
        trend: 'neutral' as const,
        description: `${window.label} rolling window`,
        icon: 'fa-regular fa-cube'
      },
      {
        title: 'Unique Senders',
        value: formatCompactNumber(window.uniqueSenders),
        trend: 'neutral' as const,
        description: `Avg util ${window.averageUtilizationPct.toFixed(1)}%`,
        icon: 'fa-regular fa-users'
      },
      {
        title: 'Total Blob Cost',
        value: formatEth(window.totalCostEth),
        trend: 'neutral' as const,
        description: `Pending: ${stats.pendingBlobsCount.toLocaleString()} blobs`,
        icon: 'fa-regular fa-scale-unbalanced-flip'
      }
    ];
  };

  const isLoading = statsLoading || windowsLoading;
  const error = statsError || windowsError;

  const loadingComponent = (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="animate-pulse bg-[#161a29]/80 rounded-lg p-5 border border-divider">
          <div className="h-5 bg-[#202538] rounded w-3/4 mb-3"></div>
          <div className="h-7 bg-[#202538] rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-[#202538] rounded w-5/6"></div>
        </div>
      ))}
    </div>
  );

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Live Metrics</h2>

      <DataStateWrapper
        isLoading={isLoading && (!displayData || !selectedWindow)}
        error={displayData && selectedWindow ? null : error}
        loadingComponent={loadingComponent}
      >
        {displayData && selectedWindow && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getMetricsFromData(displayData, selectedWindow).map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                trend={metric.trend}
                description={metric.description}
                icon={metric.icon}
              />
            ))}
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
