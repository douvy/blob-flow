"use client";

import React, { useCallback, useMemo } from 'react';
import MetricCard from './MetricCard';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { selectRollingWindow, transformStatsWindows } from '../lib/chartAggregation';
import { transformStatsResponse } from '../lib/api/stats';
import {
  BackendStatsWindowsResponse,
  Block,
  LatestBlocksResponse,
  RollingWindowDataPoint,
  StatsResponse,
} from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useBlobWebSocket, useLiveBlobEvent } from '../contexts/LiveDataContext';

const LATEST_BLOCKS_SAMPLE = 30;

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

interface TopL2Stat {
  name: string;
  share: number;
  blocksSampled: number;
}

function computeTopL2(blocks: Block[]): TopL2Stat | null {
  const counts = new Map<string, number>();
  let total = 0;

  for (const block of blocks) {
    for (const blob of block.blobs) {
      const name = blob.user_attribution || 'Unknown';
      counts.set(name, (counts.get(name) || 0) + 1);
      total += 1;
    }
  }

  if (total === 0) return null;

  let topName = '';
  let topCount = 0;
  counts.forEach((count, name) => {
    if (count > topCount) {
      topCount = count;
      topName = name;
    }
  });

  return {
    name: topName,
    share: (topCount / total) * 100,
    blocksSampled: blocks.length,
  };
}

export default function LiveMetrics() {
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const { latestEvents } = useBlobWebSocket();
  const network = selectedNetwork.apiParam;

  const fetchStats = useCallback(() => api.getStats(network), [network]);
  const fetchStatsWindows = useCallback(
    () => api.getStatsWindows(undefined, network),
    [network]
  );
  const fetchLatestBlocks = useCallback(
    () => api.getLatestBlocks(LATEST_BLOCKS_SAMPLE, network),
    [network]
  );

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useApiData<StatsResponse>(fetchStats, undefined, network);

  const {
    data: statsWindows,
    isLoading: windowsLoading,
    error: windowsError,
  } = useApiData<BackendStatsWindowsResponse>(fetchStatsWindows, undefined, network);

  const {
    data: latestBlocks,
    isLoading: blocksLoading,
    error: blocksError,
    refetch: refetchLatestBlocks,
  } = useApiData<LatestBlocksResponse>(fetchLatestBlocks, undefined, network);

  useLiveBlobEvent('new_block', () => {
    void refetchLatestBlocks();
  });

  const rollingWindows = useMemo(
    () => (statsWindows ? transformStatsWindows(statsWindows) : []),
    [statsWindows]
  );

  const selectedWindow = useMemo(
    () => selectRollingWindow(rollingWindows, timeRange),
    [rollingWindows, timeRange]
  );

  const liveStats = latestEvents.stats_update
    ? transformStatsResponse(latestEvents.stats_update.data)
    : undefined;
  const displayStats = liveStats || statsData;

  const latestBlock = latestBlocks?.data[0];

  const topL2 = useMemo(
    () => computeTopL2(latestBlocks?.data ?? []),
    [latestBlocks]
  );

  const getMetrics = (
    stats: StatsResponse,
    window: RollingWindowDataPoint,
    block: Block | undefined,
    l2: TopL2Stat | null,
  ) => [
    {
      title: 'Avg Base Fee',
      value: formatGwei(window.averageBaseFeeGwei),
      trend: 'neutral' as const,
      description: `Median ${formatGwei(window.medianBaseFeeGwei)} · p95 ${formatGwei(window.p95BaseFeeGwei)}`,
      icon: 'fa-regular fa-money-bills',
    },
    {
      title: 'Latest Block',
      value: block ? `#${block.id.toLocaleString()}` : '—',
      trend: 'neutral' as const,
      description: block
        ? `${block.blobCount}${block.maxBlobs ? `/${block.maxBlobs}` : ''} blobs · ${block.timestamp}`
        : 'Waiting for next block',
      icon: 'fa-regular fa-cube',
    },
    {
      title: 'Pending Blobs',
      value: formatCompactNumber(stats.data.pendingBlobsCount),
      trend: 'neutral' as const,
      description: `${formatCompactNumber(window.uniqueSenders)} senders · ${window.label}`,
      icon: 'fa-regular fa-hourglass-half',
    },
    {
      title: 'Top L2',
      value: l2 ? l2.name : '—',
      trend: 'neutral' as const,
      description: l2
        ? `${l2.share.toFixed(0)}% of last ${l2.blocksSampled} blocks`
        : 'No attributed blobs yet',
      icon: 'fa-regular fa-layer-group',
    },
  ];

  const isLoading = statsLoading || windowsLoading || blocksLoading;
  const error = statsError || windowsError || blocksError;
  const haveData = Boolean(displayStats && selectedWindow);

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
        isLoading={isLoading && !haveData}
        error={haveData ? null : error}
        loadingComponent={loadingComponent}
      >
        {displayStats && selectedWindow && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getMetrics(displayStats, selectedWindow, latestBlock, topL2).map((metric, index) => (
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
