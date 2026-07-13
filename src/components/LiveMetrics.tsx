"use client";

import React, { useCallback, useMemo } from 'react';
import { Banknote, Box, Hourglass, User } from 'lucide-react';
import MetricCard from './MetricCard';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { selectRollingWindow, transformStatsWindows } from '../lib/chartAggregation';
import {
  BackendStatsWindowsResponse,
  Block,
  MempoolPressure,
  RollingWindowDataPoint,
} from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useMempoolPressure } from '../hooks/useMempoolPressure';
import { useNetwork } from '../hooks/useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useLiveBlockList } from '../hooks/useLiveBlockList';
import { formatScientific, RUNAWAY_GWEI_THRESHOLD, truncateAddress } from '../utils';
import { useNow } from '../hooks/useNow';
import { formatRelativeTime } from '../lib/api/core';

const LATEST_BLOCKS_SAMPLE = 30;

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatGwei(value: number): string {
  if (value === 0) return '0 Gwei';
  // Runaway testnet fees are unreadable spelled out: switch to "2.84e22 Gwei".
  if (value >= RUNAWAY_GWEI_THRESHOLD) return `${formatScientific(value)} Gwei`;
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
 * are included; `/blob/latest` may return fewer records than the pricing
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
  const network = selectedNetwork.apiParam;

  const fetchStatsWindows = useCallback(
    () => api.getStatsWindows(undefined, network),
    [network]
  );

  const {
    data: statsWindows,
    isLoading: windowsLoading,
    error: windowsError,
  } = useApiData<BackendStatsWindowsResponse>(fetchStatsWindows, ['stats-windows', network]);

  // Pending Blobs reads the shared mempool pressure snapshot, the same cache
  // entry behind the hero's Pending stat and the /mempool page, so those
  // numbers can never disagree. Optional: the card degrades to "-" if the
  // pressure endpoint is down.
  const {
    data: mempoolPressure,
    isLoading: pressureLoading,
    error: pressureError,
  } = useMempoolPressure(network);

  // The rolling sample behind Latest Block and Top User: every live block is
  // folded over the REST baseline, so long sessions keep a current sample
  // instead of drifting back toward mount-time blocks.
  const {
    blocks: sampleBlocks,
    isLoading: blocksLoading,
    error: blocksError,
  } = useLiveBlockList(LATEST_BLOCKS_SAMPLE);

  const rollingWindows = useMemo(
    () => (statsWindows ? transformStatsWindows(statsWindows) : []),
    [statsWindows]
  );

  const selectedWindow = useMemo(
    () => selectRollingWindow(rollingWindows, timeRange),
    [rollingWindows, timeRange]
  );

  const latestBlock: Block | undefined = sampleBlocks[0];

  const topUser = useMemo(
    () => computeTopUser(sampleBlocks),
    [sampleBlocks]
  );

  const now = useNow();

  const getMetrics = (
    pressure: MempoolPressure | undefined,
    window: RollingWindowDataPoint,
    block: Block | undefined,
    user: TopUserStat | null,
  ) => [
    {
      title: `Avg Base Fee (${window.label})`,
      value: formatGwei(window.averageBaseFeeGwei),
      trend: 'neutral' as const,
      description: `Median ${formatGwei(window.medianBaseFeeGwei)} · p95 ${formatGwei(window.p95BaseFeeGwei)}`,
      icon: Banknote,
    },
    {
      title: 'Latest Block',
      value: block ? `#${block.id.toLocaleString()}` : '-',
      trend: 'neutral' as const,
      description: block
        ? `${block.blobCount}${block.maxBlobs ? `/${block.maxBlobs}` : ''} blobs · ${formatRelativeTime(block.timestamp, new Date(now))}`
        : 'Waiting for next block',
      icon: Box,
      href: '/blocks',
      ariaLabel: 'View latest blocks',
    },
    {
      title: 'Pending Blobs',
      value: pressure ? formatCompactNumber(pressure.pendingBlobCount) : '-',
      trend: 'neutral' as const,
      // A failed refetch keeps the last snapshot on screen (React Query
      // retains data on error), so disclose the staleness like the mempool
      // strip does instead of silently presenting an old count as current.
      description: pressure
        ? `${formatCompactNumber(pressure.pendingUniqueSenders)} senders · public mempool${
          pressureError ? ' · refresh failed' : ''
        }`
        : 'public mempool',
      icon: Hourglass,
      href: '/mempool',
      ariaLabel: 'View pending blobs in the mempool',
    },
    {
      title: 'Top User',
      value: user ? user.name : '-',
      trend: 'neutral' as const,
      description: user
        ? `${user.share.toFixed(0)}% of last ${user.blocksSampled} blocks`
        : 'No user data yet',
      icon: User,
      href: user ? `/user/${encodeURIComponent(user.address)}` : undefined,
      ariaLabel: user ? `View user ${user.name}` : undefined,
    },
  ];

  const isLoading = windowsLoading || pressureLoading || blocksLoading;
  const headlineError = windowsError;
  const haveHeadline = Boolean(selectedWindow);

  const loadingComponent = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="animate-pulse bg-[#14161a] rounded-lg p-5 border border-divider">
          <div className="h-5 bg-[#26282e] rounded w-3/4 mb-3"></div>
          <div className="h-7 bg-[#26282e] rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-[#26282e] rounded w-5/6"></div>
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
        {selectedWindow && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {getMetrics(mempoolPressure, selectedWindow, latestBlock, topUser).map((metric, index) => (
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
          {sampleBlocks.length > 0 ? '. Showing the most recent blocks available.' : '.'}
        </p>
      )}
    </section>
  );
}
