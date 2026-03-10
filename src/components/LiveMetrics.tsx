"use client";

import React from 'react';
import MetricCard from './MetricCard';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { StatsResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';

export default function LiveMetrics() {
  const { selectedNetwork } = useNetwork();

  // Fetch stats data from API
  const { data, isLoading, error } = useApiData<StatsResponse>(
    () => api.getStats(selectedNetwork.apiParam),
    [selectedNetwork]
  );

  // Transform API data into metrics format
  const getMetricsFromData = (statsData: StatsResponse) => {
    const stats = statsData.data;

    return [
      {
        title: 'Avg Blob Base Fee',
        value: stats.averageBaseFee,
        trend: 'neutral' as const,
        description: `${stats.totalConfirmedBlobs} confirmed blobs`,
        icon: 'fa-regular fa-money-bills'
      },
      {
        title: 'Pending Blobs in Mempool',
        value: stats.pendingBlobsCount.toString(),
        trend: 'neutral' as const,
        description: 'Current mempool status',
        icon: 'fa-regular fa-timer'
      },
      {
        title: 'Total Blobs Indexed',
        value: stats.totalBlobs.toLocaleString(),
        trend: 'neutral' as const,
        description: `Last block: ${stats.lastIndexedBlock.toLocaleString()}`,
        icon: 'fa-regular fa-cube'
      },
      {
        title: 'Avg Total Cost',
        value: stats.averageTotalCost,
        trend: 'neutral' as const,
        description: `Avg tip: ${stats.averageTip}`,
        icon: 'fa-regular fa-scale-unbalanced-flip'
      }
    ];
  };

  // Loading state component specifically for metrics cards
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
        isLoading={isLoading}
        error={error}
        loadingComponent={loadingComponent}
      >
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getMetricsFromData(data).map((metric, index) => (
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
