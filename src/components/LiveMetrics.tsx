"use client";

import React, { useCallback, useMemo } from 'react';
import MetricCard from './MetricCard';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { selectRollingWindow, transformStatsWindows } from '../lib/chartAggregation';
import { transformStatsResponse } from '../lib/api/stats';
import { transformNewBlockData } from '../lib/api/blocks';
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
import { useLatestBlobEvent, useLiveBlobEvent } from '../contexts/LiveDataContext';
import { truncateAddress } from '../utils';

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

interface TopUserStat {
  name: string;
  address: string;
  share: number;
  blocksSampled: number;
}

interface TopUserAggregate {
  address: string;
  count: number;
  attribution?: string;
}

/**
 * Aggregate blob senders across the supplied blocks to find the dominant user.
 *
 * Only blocks whose joined blob detail covers the entire pricing `blobCount`
 * are included — `/blob/latest` may return fewer records than the pricing
 * block reports for that height, and counting that partial set would skew the
 * share while still claiming to cover the full sample. Partial blocks are
 * dropped from the sample count instead of being misrepresented.
 */
function computeTopUser(blocks: Block[]): TopUserStat | null {
  const completeBlocks = blocks.filter(
    (block) => block.blobs.length >= block.blobCount
  );
  if (completeBlocks.length === 0) return null;

  const users = new Map<string, TopUserAggregate>();
  let total = 0;

  for (const block of completeBlocks) {
    for (const blob of block.blobs) {
      const address = blob.from_address.trim();
      if (!address) continue;

      const key = address.toLowerCase();
      const attribution = getAttributedName(blob.user_attribution);
      const user = users.get(key);
      if (user) {
        user.count += 1;
        user.attribution ||= attribution;
      } else {
        users.set(key, { address, count: 1, attribution });
      }
      total += 1;
    }
  }

  if (total === 0) return null;

  const topUser = Array.from(users.values()).reduce<TopUserAggregate | null>(
    (currentTopUser, user) => {
      if (!currentTopUser || user.count > currentTopUser.count) {
        return user;
      }
      return currentTopUser;
    },
    null
  );

  if (!topUser) return null;

  return {
    name: topUser.attribution || truncateAddress(topUser.address),
    address: topUser.address,
    share: (topUser.count / total) * 100,
    blocksSampled: completeBlocks.length,
  };
}

function getAttributedName(attribution?: string): string | undefined {
  const name = attribution?.trim();
  if (!name || name.toLowerCase() === 'unknown') return undefined;
  return name;
}

export default function LiveMetrics() {
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const statsUpdateEvent = useLatestBlobEvent('stats_update');
  const newBlockEvent = useLatestBlobEvent('new_block');
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

  // Refresh the rolling sample used for Top User whenever a new block lands.
  // The Latest Block card reads `newBlockEvent` directly (below) rather than
  // relying on this refetch — fetchApi dedupes in-flight GETs, so an
  // in-progress call started before the event would otherwise satisfy the
  // refetch with stale data and leave the card a block behind.
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

  const liveStats = statsUpdateEvent
    ? transformStatsResponse(statsUpdateEvent.data)
    : undefined;
  const displayStats = liveStats || statsData;

  // Prefer the WebSocket-delivered block when it is at least as new as the
  // most recently fetched one. The WS payload omits pricing params, so fall
  // back to the polled block's `maxBlobs` for the "X/Y blobs" descriptor.
  const fetchedLatest = latestBlocks?.data[0];
  const latestBlock = useMemo<Block | undefined>(() => {
    if (!newBlockEvent) return fetchedLatest;
    if (fetchedLatest && newBlockEvent.data.block_number < fetchedLatest.id) {
      return fetchedLatest;
    }
    const liveBlock = transformNewBlockData(newBlockEvent.data);
    if (!liveBlock.maxBlobs && fetchedLatest?.maxBlobs) {
      return { ...liveBlock, maxBlobs: fetchedLatest.maxBlobs };
    }
    return liveBlock;
  }, [newBlockEvent, fetchedLatest]);

  const topUser = useMemo(
    () => computeTopUser(latestBlocks?.data ?? []),
    [latestBlocks]
  );

  const getMetrics = (
    stats: StatsResponse,
    window: RollingWindowDataPoint,
    block: Block | undefined,
    user: TopUserStat | null,
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
      title: 'Top User',
      value: user ? user.name : '—',
      trend: 'neutral' as const,
      description: user
        ? `${user.share.toFixed(0)}% of last ${user.blocksSampled} blocks`
        : 'No user data yet',
      icon: 'fa-regular fa-user',
      href: user ? `/user/${encodeURIComponent(user.address)}` : undefined,
      ariaLabel: user ? `View user ${user.name}` : undefined,
    },
  ];

  const isLoading = statsLoading || windowsLoading || blocksLoading;
  const headlineError = statsError || windowsError;
  const haveHeadline = Boolean(displayStats && selectedWindow);

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
        isLoading={isLoading && !haveHeadline}
        error={haveHeadline ? null : headlineError || blocksError}
        loadingComponent={loadingComponent}
      >
        {displayStats && selectedWindow && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getMetrics(displayStats, selectedWindow, latestBlock, topUser).map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                trend={metric.trend}
                description={metric.description}
                icon={metric.icon}
                href={metric.href}
                ariaLabel={metric.ariaLabel}
              />
            ))}
          </div>
        )}
      </DataStateWrapper>

      {haveHeadline && blocksError && (
        <p className="mt-3 text-xs text-red-300">
          Latest Block and Top User data unavailable:{' '}
          {blocksError.message}
          {latestBlocks ? '. Showing the last successful sample.' : '.'}
        </p>
      )}
    </section>
  );
}
