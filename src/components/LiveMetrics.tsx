"use client";

import React, { useCallback, useMemo } from 'react';
import { Banknote, Box, Hourglass, User as UserIcon } from 'lucide-react';
import MetricCard from './MetricCard';
import { RankMarker } from './RankIndicators';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { selectRollingWindow, transformStatsWindows } from '../lib/chartAggregation';
import {
  BackendStatsWindowsResponse,
  Block,
  RollingWindowDataPoint,
  User,
} from '../types';
import DataStateWrapper from './DataStateWrapper';
import { MEMPOOL_SAMPLE_LIMIT } from '../constants';
import { aggregateMempoolAttribution } from '../lib/mempoolAttribution';
import { useMempoolLiveList } from '../hooks/useMempoolLiveList';
import { useNetwork } from '../hooks/useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useLiveBlockList } from '../hooks/useLiveBlockList';
import { useTopUsers } from '../hooks/useTopUsers';
import { formatScientific, RUNAWAY_GWEI_THRESHOLD } from '../utils';
import { useNow } from '../hooks/useNow';
import { formatRelativeTime } from '../lib/api/core';

const LATEST_BLOCKS_SAMPLE = 30;
// Must match the Top Blob Users table's limit so both read (and dedupe into)
// the same top-users cache entry.
const TOP_USERS_LIMIT = 10;

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

/**
 * Pick the dominant user from the window's rows. The backend sorts by blob
 * count, but selecting the max locally keeps the card correct even if the
 * ordering contract ever changes.
 */
function selectTopUser(users: User[]): User | null {
  return users.reduce<User | null>(
    (currentTopUser, user) =>
      !currentTopUser || user.dataCount > currentTopUser.dataCount ? user : currentTopUser,
    null
  );
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

  // Pending Blobs derives from the same live mempool list (and cache entry)
  // as the homepage Mempool strip and the /mempool page, so the surfaces
  // cannot disagree. The pressure endpoint used to feed this card, but its
  // periodic snapshot lagged the event-applied list by several seconds and
  // the counts visibly contradicted the strip. Optional: the card degrades
  // to "-" if the mempool endpoint is down.
  const {
    transactions: mempoolTransactions,
    truncated: mempoolTruncated,
    isLoading: mempoolLoading,
    error: mempoolError,
  } = useMempoolLiveList(MEMPOOL_SAMPLE_LIMIT, network);

  const mempoolSummary = useMemo(
    () => aggregateMempoolAttribution(mempoolTransactions ?? []),
    [mempoolTransactions]
  );

  // The rolling sample behind Latest Block: every live block is folded over
  // the REST baseline, so long sessions keep a current sample instead of
  // drifting back toward mount-time blocks.
  const {
    blocks: sampleBlocks,
    isLoading: blocksLoading,
    error: blocksError,
  } = useLiveBlockList(LATEST_BLOCKS_SAMPLE);

  // Top User reads the same range-scoped cache entry as the Top Blob Users
  // table, so the card always names the table's leading row for the selected
  // time filter.
  const {
    data: topUsers,
    isLoading: usersLoading,
    error: usersError,
  } = useTopUsers(TOP_USERS_LIMIT, network, timeRange);

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
    () => selectTopUser(topUsers?.data ?? []),
    [topUsers]
  );

  const now = useNow();

  const getMetrics = (
    window: RollingWindowDataPoint,
    block: Block | undefined,
    user: User | null,
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
      value: mempoolTransactions
        ? `${formatCompactNumber(mempoolSummary.blobCount)}${mempoolTruncated ? '+' : ''}`
        : '-',
      trend: 'neutral' as const,
      // Under truncation the counts are lower bounds, marked "+" like the
      // /mempool stat cards. A failed refetch keeps the last list on screen
      // (React Query retains data on error), so disclose the staleness like
      // the mempool strip does instead of silently presenting an old count
      // as current.
      description: mempoolTransactions
        ? `${formatCompactNumber(mempoolSummary.uniqueSenderCount)}${
          mempoolTruncated ? '+' : ''
        } senders · public mempool${mempoolError ? ' · refresh failed' : ''}`
        : 'public mempool',
      icon: Hourglass,
      href: '/mempool',
      ariaLabel: 'View pending blobs in the mempool',
    },
    {
      title: `Top User (${timeRange})`,
      value: user ? user.name : '-',
      // The card is the compact face of the leaderboard's podium; mirror the
      // table's rank 1 medal so the two surfaces read as one ranking.
      valueAdornment: user ? <RankMarker rank={1} size="sm" /> : undefined,
      trend: 'neutral' as const,
      // Mirrors the Top Blob Users table's Count and share columns for the
      // same window. The share denominator depends on the payload: server
      // shares cover all blobs in the window, the local fallback covers only
      // the returned rows, so the label must not overclaim. A failed refetch
      // keeps the last rows cached, so disclose the staleness like the
      // Pending Blobs card does.
      description: user
        ? `${formatCompactNumber(user.dataCount)} blobs · ${user.percentage}% of ${
          topUsers?.hasServerShares ? 'total' : `top ${TOP_USERS_LIMIT}`
        }${usersError ? ' · refresh failed' : ''}`
        : usersLoading
          ? 'Loading window data'
          : usersError
            ? 'User data unavailable'
            : 'No user data yet',
      icon: UserIcon,
      href: user ? `/user/${encodeURIComponent(user.address)}` : undefined,
      ariaLabel: user ? `View user ${user.name}` : undefined,
    },
  ];

  const isLoading = windowsLoading || mempoolLoading || blocksLoading || usersLoading;
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
            {getMetrics(selectedWindow, latestBlock, topUser).map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                trend={metric.trend}
                description={metric.description}
                icon={metric.icon}
                href={metric.href}
                ariaLabel={metric.ariaLabel}
                valueAdornment={'valueAdornment' in metric ? metric.valueAdornment : undefined}
              />
            ))}
          </div>
        )}
      </DataStateWrapper>

      {haveHeadline && blocksError && (
        <p className="mt-3 text-xs text-red-300">
          Latest Block data unavailable:{' '}
          {blocksError.message}
          {sampleBlocks.length > 0 ? '. Showing the most recent blocks available.' : '.'}
        </p>
      )}
    </section>
  );
}
