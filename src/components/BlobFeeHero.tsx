"use client";

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp, MoveRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type MouseHandlerDataParam,
} from 'recharts';
import { api } from '@/lib/api';
import { transformPricingRecentBlock } from '@/lib/api/pricing';
import {
  getBackendChartRange,
  getRequestedRollingWindow,
  transformStatsWindows,
} from '@/lib/chartAggregation';
import { useTimeRange, type TimeRange } from '@/contexts/TimeRangeContext';
import {
  HERO_CHART_BLOCKS,
  HERO_STRIP_BLOCKS,
  compareToWindows,
  computeFeeRangeTrend,
  countBlocksAboveTarget,
  countChartPointsAboveTarget,
  getWindowAboveTargetSummary,
  formatFeeNumber,
  formatSignedPercent,
  groupChartPointsForStrip,
  mergeRecentPricingBlocks,
  parseGwei,
  type HeroStripBucket,
} from '@/lib/blobFeeHero';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { useNow } from '@/hooks/useNow';
import { useBlobWebSocket, useLiveBlobEvent } from '@/contexts/LiveDataContext';
import { formatRelativeTime } from '@/lib/api/core';
import DataStateWrapper from './DataStateWrapper';
import {
  Tooltip as InfoTooltip,
  TooltipContent as InfoTooltipContent,
  TooltipTrigger as InfoTooltipTrigger,
} from './ui/tooltip';
import type {
  BackendBlobMarketChartResponse,
  BackendBlobMarketChartPoint,
  BackendStatsWindowsResponse,
  BlobPricing,
  BlobPricingRecentBlock,
  MempoolPressure,
  RollingWindowKey,
} from '@/types';
import {
  AXIS_LINE,
  AXIS_STROKE,
  AXIS_TICK,
  CHART_ITEM_STYLE,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  COLORS,
} from '@/constants/chartTheme';
import { formatGwei, formatPercent } from '@/utils';

const PRICING_FALLBACK_REFRESH_MS = 30000;
const MEMPOOL_REFRESH_MS = 30000;

interface DirectionStyle {
  label: string;
  chipClass: string;
  Icon: typeof TrendingUp;
}

const DIRECTION_STYLES: Record<string, DirectionStyle> = {
  up: {
    label: 'Rising',
    chipClass: 'border-red-400/15 bg-red-800/5 text-red-200',
    Icon: TrendingUp,
  },
  down: {
    label: 'Falling',
    chipClass: 'border-green-400/15 bg-green-800/5 text-green-200',
    Icon: TrendingDown,
  },
  stable: {
    label: 'Stable',
    chipClass: 'border-gray-400/15 bg-gray-800/5 text-gray-200',
    Icon: MoveRight,
  },
};

function getDirectionStyle(direction: string | undefined): DirectionStyle {
  return DIRECTION_STYLES[direction?.toLowerCase() ?? ''] ?? DIRECTION_STYLES.stable;
}

function getDirectionExplanation(
  direction: DirectionStyle,
  deltaPercent: number | undefined,
  rangeLabel: string
): string {
  if (deltaPercent === undefined) {
    return `${direction.label} is based on the blob base fee data available in the selected ${rangeLabel} view.`;
  }

  return `${direction.label} is based on the first and latest blob base fee points in the selected ${rangeLabel} view: ${formatSignedPercent(deltaPercent)} across the range.`;
}

const LIVE_BADGE_STYLES: Record<string, { label: string; dotClass: string; textClass: string }> = {
  connected: { label: 'Live', dotClass: 'bg-green', textClass: 'text-green' },
  connecting: { label: 'Connecting', dotClass: 'bg-yellow-400', textClass: 'text-yellow-400' },
  reconnecting: { label: 'Reconnecting', dotClass: 'bg-yellow-400', textClass: 'text-yellow-400' },
  stale: { label: 'Stale', dotClass: 'bg-yellow-400', textClass: 'text-yellow-400' },
  disconnected: { label: 'Offline', dotClass: 'bg-red', textClass: 'text-red' },
};

/**
 * Streaming indicator: colored by connection state, with a ring pulse every
 * time a new block lands (`pulseKey` changes).
 */
function LiveBadge({ pulseKey }: { pulseKey: number }) {
  const { connectionState } = useBlobWebSocket();
  const status = LIVE_BADGE_STYLES[connectionState] ?? LIVE_BADGE_STYLES.connecting;
  const shouldPulse = connectionState === 'connected' && pulseKey > 0;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${status.textClass}`}>
      <span className="relative flex h-2 w-2">
        <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
        {shouldPulse && (
          <span
            key={pulseKey}
            className={`absolute inset-0 rounded-full ${status.dotClass} animate-[live-activity-pulse_800ms_ease-out_forwards] motion-reduce:animate-none`}
          />
        )}
      </span>
      {status.label}
    </span>
  );
}

function stripGweiUnit(value: string): string {
  return value.replace(/\s*Gwei$/i, '');
}

/** Header time ranges that the hero renders from bucketed chart data. */
const RANGE_LABELS: Record<TimeRange, string> = {
  '1h': 'last 1h',
  '24h': 'last 24h',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  All: 'last 30 days',
};

const TREND_CHIP_LABELS: Record<TimeRange, string> = {
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  All: '30d',
};

/** Unit shown under the "Above target" count for bucketed ranges. */
const BUCKET_HINTS: Record<string, string> = {
  block: 'block buckets',
  minute: 'minute buckets',
  hour: 'hourly buckets',
  day: 'daily buckets',
};

/**
 * Caption hint for the fullness strip. When the strip merges several chart
 * buckets per bar, describe the merged bar span (e.g. "7-hour buckets")
 * instead of the backend granularity.
 */
function getBucketStripHint(
  marketChart: BackendBlobMarketChartResponse,
  stripBuckets: HeroStripBucket[]
): string {
  const baseHint = BUCKET_HINTS[marketChart.granularity] ?? `${marketChart.granularity} buckets`;
  if (stripBuckets.length === 0) return baseHint;

  // Bars can differ by one bucket when the count doesn't divide evenly; the
  // rounded mean matches the dominant bar span.
  const totalBuckets = stripBuckets.reduce((total, bucket) => total + bucket.bucket_count, 0);
  const bucketsPerBar = Math.round(totalBuckets / stripBuckets.length);
  if (bucketsPerBar <= 1) return baseHint;

  const seconds = marketChart.bucket_seconds * bucketsPerBar;
  if (!Number.isFinite(seconds) || seconds <= 0) return baseHint;
  if (seconds === 86400) return BUCKET_HINTS.day;
  if (seconds === 3600) return BUCKET_HINTS.hour;
  if (seconds % 86400 === 0) return `${seconds / 86400}-day buckets`;
  if (seconds % 3600 === 0) return `${seconds / 3600}-hour buckets`;
  if (seconds % 60 === 0) return `${seconds / 60}-minute buckets`;
  return baseHint;
}

function isDayScaleRange(timeRange: TimeRange): boolean {
  return timeRange === '7d' || timeRange === '30d' || timeRange === 'All';
}

function formatBucketLabel(timestamp: string, dayScale: boolean): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  if (dayScale) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function formatChartTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

interface HeroChartPoint {
  /** Set for per-block points; bucketed range points are not clickable. */
  blockNumber?: number;
  label: string;
  fee: number;
  blobCount: number;
  maxBlobs: number;
}

interface FullnessStripItem {
  key: string;
  href?: string;
  title: string;
  ariaLabel: string;
  fillPercent: number;
  isFull: boolean;
  isAboveTarget: boolean;
  isNewest?: boolean;
}

// Memoized: the hero re-renders every second for the "Xs ago" caption, and
// the chart only needs to redraw when a block actually lands.
const HeroFeeChart = React.memo(function HeroFeeChart({
  points,
  referenceFeeGwei,
}: {
  points: HeroChartPoint[];
  referenceFeeGwei?: number;
}) {
  const router = useRouter();

  const handleClick = useCallback(
    (state: MouseHandlerDataParam) => {
      const index = Number(state.activeIndex);
      const point = Number.isInteger(index) ? points[index] : undefined;
      if (point?.blockNumber !== undefined) {
        router.push(`/block/${point.blockNumber}`);
      }
    },
    [router, points]
  );

  const hasBlockLinks = points.some((point) => point.blockNumber !== undefined);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={points}
        margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
        onClick={handleClick}
        className={hasBlockLinks ? 'cursor-pointer' : undefined}
      >
        <defs>
          <linearGradient id="heroFeeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.35} />
            <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} vertical={false} />
        <XAxis
          dataKey="label"
          stroke={AXIS_STROKE}
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={AXIS_LINE}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          stroke={AXIS_STROKE}
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={AXIS_LINE}
          width={52}
          domain={['auto', 'auto']}
          tickFormatter={(value: number) => formatFeeNumber(value)}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_LABEL_STYLE}
          itemStyle={CHART_ITEM_STYLE}
          labelFormatter={(label, payload) => {
            const point = payload?.[0]?.payload as HeroChartPoint | undefined;
            if (!point) return label;
            const blobs = point.maxBlobs > 0
              ? `${point.blobCount}/${point.maxBlobs} blobs`
              : `${point.blobCount.toLocaleString()} blobs`;
            if (point.blockNumber === undefined) {
              return `${label} · ${blobs}`;
            }
            return `Block ${point.blockNumber.toLocaleString()} · ${blobs} · ${label}`;
          }}
          formatter={(value) => {
            const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
            return [`${formatFeeNumber(numericValue)} Gwei`, 'Blob base fee'];
          }}
        />
        {referenceFeeGwei !== undefined && referenceFeeGwei > 0 && (
          <ReferenceLine
            y={referenceFeeGwei}
            stroke={COLORS.purple}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
          />
        )}
        <Area
          type="monotone"
          dataKey="fee"
          stroke={COLORS.blue}
          strokeWidth={2}
          fill="url(#heroFeeGradient)"
          name="Blob base fee"
          dot={false}
          activeDot={{ r: 4, fill: COLORS.blue }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const BlockFullnessStrip = React.memo(function BlockFullnessStrip({
  items,
  targetPercent,
  caption,
}: {
  items: FullnessStripItem[];
  targetPercent: number | null;
  caption: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="relative flex h-7 items-end gap-2">
        {targetPercent !== null && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 z-10 border-t border-dashed border-white/40"
            style={{ bottom: `${targetPercent}%` }}
            title="Target"
          />
        )}
        {items.map((item) => {
          const fillPercent = Math.min(100, Math.max(0, item.fillPercent));
          const bar = (
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 origin-bottom animate-[bar-grow-in_600ms_ease-out] motion-reduce:animate-none ${
                item.isFull ? 'bg-red-400' : item.isAboveTarget ? 'bg-amber-400' : 'bg-green-400'
              } opacity-70 group-hover:opacity-90`}
              style={{ height: `${fillPercent}%`, minHeight: fillPercent > 0 ? '2px' : '0' }}
            />
          );

          if (item.href) {
            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.title}
                aria-label={item.ariaLabel}
                className={`group relative h-full flex-1 overflow-hidden rounded-[2px] bg-[#181f2f] border border-[#263044] transition-colors hover:bg-[#1e2738] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue ${
                  item.isNewest ? 'ring-1 ring-white/30' : ''
                }`}
              >
                {bar}
              </Link>
            );
          }

          return (
            <span
              key={item.key}
              role="meter"
              aria-label={item.ariaLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fillPercent)}
              title={item.title}
              className="group relative h-full flex-1 overflow-hidden rounded-[2px] bg-[#181f2f] border border-[#263044]"
            >
              {bar}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6e7687]">
        <span>{caption}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-[2px] bg-green-400" /> under target
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-[2px] bg-amber-400" /> above
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-[2px] bg-red-400" /> full
          </span>
        </span>
      </div>
    </div>
  );
});

function getBlockStripTargetPercent(blocks: BlobPricingRecentBlock[]): number | null {
  const reference = blocks.find((block) => block.maxBlobs > 0 && block.targetBlobs > 0);
  if (!reference) return null;
  return Math.min(100, Math.max(0, (reference.targetBlobs / reference.maxBlobs) * 100));
}

function getBucketTargetPercent(points: BackendBlobMarketChartPoint[]): number | null {
  const reference = points.find((point) => (
    point.blob_gas_limit !== undefined &&
    point.blob_gas_limit > 0 &&
    point.blob_gas_target > 0
  ));
  if (!reference?.blob_gas_limit) return null;
  return Math.min(100, Math.max(0, (reference.blob_gas_target / reference.blob_gas_limit) * 100));
}

function getBucketFillPercent(point: BackendBlobMarketChartPoint): number {
  if (point.blob_gas_limit !== undefined && point.blob_gas_limit > 0) {
    return (point.blob_gas_used / point.blob_gas_limit) * 100;
  }
  return parseGwei(point.average_utilization) * 100;
}

function isFullBucket(point: BackendBlobMarketChartPoint): boolean {
  if (point.blob_gas_limit !== undefined && point.blob_gas_limit > 0) {
    return point.blob_gas_used >= point.blob_gas_limit;
  }
  return parseGwei(point.average_utilization) >= 1;
}

function describeBucketBlocks(point: BackendBlobMarketChartPoint): string | null {
  if (point.start_block !== undefined && point.end_block !== undefined) {
    if (point.start_block === point.end_block) {
      return `block ${point.end_block.toLocaleString()}`;
    }
    return `blocks ${point.start_block.toLocaleString()}-${point.end_block.toLocaleString()}`;
  }
  if (point.end_block !== undefined) return `through block ${point.end_block.toLocaleString()}`;
  if (point.start_block !== undefined) return `from block ${point.start_block.toLocaleString()}`;
  return null;
}

function buildBlockStripItems(blocks: BlobPricingRecentBlock[]): FullnessStripItem[] {
  // Oldest on the left, newest on the right, matching the chart above.
  return blocks
    .slice()
    .reverse()
    .map((block, index, orderedBlocks) => ({
      key: block.blockNumber.toString(),
      href: `/block/${block.blockNumber}`,
      title: `Block ${block.blockNumber.toLocaleString()} · ${block.blobCount}/${block.maxBlobs} blobs (${formatPercent(block.utilizationPercent, 0)}) · ${formatGwei(block.blobBaseFeeGwei, 6)}`,
      ariaLabel: `View block ${block.blockNumber}: ${block.blobCount} of ${block.maxBlobs} blobs used`,
      fillPercent: block.utilizationPercent,
      isFull: block.isFull,
      isAboveTarget: block.isAboveTarget,
      isNewest: index === orderedBlocks.length - 1,
    }));
}

function formatStripBucketLabel(bucket: HeroStripBucket, dayScale: boolean): string {
  const startLabel = bucket.label || formatBucketLabel(bucket.timestamp, dayScale);
  if (bucket.bucket_count <= 1) return startLabel;

  const endLabel = formatBucketLabel(bucket.end_timestamp, dayScale);
  if (endLabel && endLabel !== startLabel) return `${startLabel} – ${endLabel}`;

  if (dayScale) {
    // Same-day bar on a day-scale range (e.g. 7-hour bars on 7d): add the
    // bucket start times so bars within one day stay distinguishable.
    const startTime = formatBucketLabel(bucket.timestamp, false);
    const endTime = formatBucketLabel(bucket.end_timestamp, false);
    if (startTime && endTime && startTime !== endTime) {
      return `${startLabel} ${startTime} – ${endTime}`;
    }
  }

  return startLabel;
}

function buildBucketStripItems(
  points: HeroStripBucket[],
  dayScale: boolean
): FullnessStripItem[] {
  return points.map((point, index) => {
    const label = formatStripBucketLabel(point, dayScale);
    const fillPercent = getBucketFillPercent(point);
    const blockDescription = describeBucketBlocks(point);
    const blockSuffix = blockDescription ? ` · ${blockDescription}` : '';
    const targetState = point.blob_gas_target > 0 && point.blob_gas_used > point.blob_gas_target
      ? 'above target'
      : 'under target';

    return {
      key: `${point.timestamp}-${point.end_block ?? point.start_block ?? index}`,
      title: `${label}${blockSuffix} · ${point.blob_count.toLocaleString()} blobs · ${formatPercent(fillPercent, 0)} used · ${targetState}`,
      ariaLabel: `${label}: ${point.blob_count.toLocaleString()} blobs, ${formatPercent(fillPercent, 0)} used, ${targetState}`,
      fillPercent,
      isFull: isFullBucket(point),
      isAboveTarget: point.blob_gas_target > 0 && point.blob_gas_used > point.blob_gas_target,
    };
  });
}

function ComparisonBadge({ label, deltaPercent, averageGwei }: {
  label: string;
  deltaPercent: number;
  averageGwei: number;
}) {
  const isElevated = deltaPercent > 10;
  const isDepressed = deltaPercent < -10;
  const toneClass = isElevated ? 'text-red' : isDepressed ? 'text-green' : 'text-[#d7dde8]';

  return (
    <div className="rounded-md border border-[#1e2024] bg-[#14161a] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white">vs {label} avg</div>
      <div className={`mt-0.5 text-base font-medium ${toneClass}`}>
        {formatSignedPercent(deltaPercent)}
      </div>
      <div className="text-[10px] text-[#666666]">avg {formatFeeNumber(averageGwei)} Gwei</div>
    </div>
  );
}

function PressureStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-[#292e35] bg-[#17181b] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-white">{value}</div>
      {hint && <div className="text-[10px] text-[#666666]">{hint}</div>}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-divider bg-[#161a29]/80 p-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <div className="h-4 w-40 rounded bg-[#202538]" />
          <div className="h-14 w-56 rounded bg-[#202538]" />
          <div className="h-4 w-64 rounded bg-[#202538]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded bg-[#202538]" />
            <div className="h-16 rounded bg-[#202538]" />
          </div>
        </div>
        <div className="lg:col-span-7 space-y-4">
          <div className="h-44 rounded bg-[#202538]" />
          <div className="h-7 rounded bg-[#202538]" />
        </div>
      </div>
    </div>
  );
}

export default function BlobFeeHero() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const { timeRange } = useTimeRange();
  // The 1h view is the live per-block stream; longer ranges render the
  // bucketed chart history while everything else in the hero stays live.
  const isLiveRange = timeRange === '1h';

  const fetchPricing = useCallback(
    () => api.getBlobPricing(network, HERO_CHART_BLOCKS),
    [network]
  );
  const {
    data: pricing,
    isLoading,
    error,
    refetch: refetchPricing,
  } = useApiData<BlobPricing>(
    fetchPricing,
    ['blob-pricing-hero', network, HERO_CHART_BLOCKS],
    { refetchInterval: PRICING_FALLBACK_REFRESH_MS }
  );

  // Rolling-window context for the "how abnormal is this" comparison: always
  // 1h and 24h, plus the selected header range's window when it differs.
  // Optional; the hero renders without it if the stats endpoint is down.
  const requestedWindows = useMemo<RollingWindowKey[]>(() => {
    const windows: RollingWindowKey[] = ['1h', '24h'];
    const rangeWindow = getRequestedRollingWindow(timeRange);
    if (!windows.includes(rangeWindow)) {
      windows.push(rangeWindow);
    }
    return windows;
  }, [timeRange]);
  const fetchWindows = useCallback(
    () => api.getStatsWindows(requestedWindows, network),
    [requestedWindows, network]
  );
  const { data: statsWindows } = useApiData<BackendStatsWindowsResponse>(
    fetchWindows,
    ['stats-windows-hero', network, requestedWindows.join(',')]
  );

  // Bucketed fee history for the selected header range (24h/7d/30d/All).
  // Shares the React Query cache key with the Data Trends charts.
  const backendRange = getBackendChartRange(timeRange);
  const fetchMarketChart = useCallback(
    () => api.getBlobMarketChart(backendRange, network),
    [backendRange, network]
  );
  const {
    data: marketChart,
    isLoading: marketChartLoading,
    error: marketChartError,
  } = useApiData<BackendBlobMarketChartResponse>(
    fetchMarketChart,
    ['chart-market', network, backendRange],
    { enabled: !isLiveRange }
  );

  // Mempool demand signal. Also optional.
  const fetchMempoolPressure = useCallback(
    () => api.getMempoolPressure(network),
    [network]
  );
  const { data: mempoolPressure } = useApiData<MempoolPressure>(
    fetchMempoolPressure,
    ['mempool-pressure-hero', network],
    { refetchInterval: MEMPOOL_REFRESH_MS }
  );

  // Blocks accumulated live from the WebSocket between pricing refetches.
  const [liveState, setLiveState] = useState<{
    network: string;
    blocks: BlobPricingRecentBlock[];
  }>({ network, blocks: [] });

  useLiveBlobEvent('new_block', (event) => {
    const pricingRecord = event.data.pricing;
    if (pricingRecord) {
      const block = transformPricingRecentBlock(pricingRecord);
      setLiveState((currentState) => ({
        network,
        blocks: mergeRecentPricingBlocks(
          [block],
          currentState.network === network ? currentState.blocks : [],
          HERO_CHART_BLOCKS
        ),
      }));
    }
    // Keep prediction and market pressure in step with the chain head.
    void refetchPricing();
  });

  const blocks = useMemo(
    () =>
      mergeRecentPricingBlocks(
        pricing?.recentBlocks ?? [],
        liveState.network === network ? liveState.blocks : [],
        HERO_CHART_BLOCKS
      ),
    [pricing, liveState, network]
  );

  const headBlock = blocks[0];
  const currentFeeGwei = headBlock
    ? parseGwei(headBlock.blobBaseFeeGwei)
    : parseGwei(pricing?.currentBaseFeeGwei);
  // Tick animation: re-runs whenever the head block changes (via `key`),
  // nudging the readout from the direction the fee moved.
  const previousFeeGwei = blocks[1] ? parseGwei(blocks[1].blobBaseFeeGwei) : null;
  const feeTickClass =
    previousFeeGwei === null || currentFeeGwei === previousFeeGwei
      ? ''
      : currentFeeGwei > previousFeeGwei
        ? 'animate-[fee-tick-up_900ms_ease-out]'
        : 'animate-[fee-tick-down_900ms_ease-out]';

  const rollingWindows = useMemo(
    () => (statsWindows ? transformStatsWindows(statsWindows) : []),
    [statsWindows]
  );
  const comparisons = useMemo(() => {
    if (currentFeeGwei <= 0) return [];
    return compareToWindows(currentFeeGwei, rollingWindows);
  }, [rollingWindows, currentFeeGwei]);
  const oneHourAverageGwei = comparisons.find((comparison) => comparison.window === '1h')?.averageGwei;

  const chartPoints = useMemo<HeroChartPoint[]>(() => {
    if (isLiveRange) {
      return blocks
        .slice()
        .reverse()
        .map((block) => ({
          blockNumber: block.blockNumber,
          label: formatChartTime(block.blockTimestamp),
          fee: parseGwei(block.blobBaseFeeGwei),
          blobCount: block.blobCount,
          maxBlobs: block.maxBlobs,
        }));
    }

    const dayScale = isDayScaleRange(timeRange);
    return (marketChart?.points ?? []).map((point) => ({
      label: point.label || formatBucketLabel(point.timestamp, dayScale),
      fee: parseGwei(point.average_blob_base_fee_gwei),
      blobCount: point.blob_count,
      maxBlobs: 0,
    }));
  }, [isLiveRange, blocks, marketChart, timeRange]);

  const rangeTrend = useMemo(
    () => computeFeeRangeTrend(chartPoints.map((point) => point.fee)),
    [chartPoints]
  );
  const trendRangeLabel = RANGE_LABELS[timeRange];
  const trendChipLabel = TREND_CHIP_LABELS[timeRange];

  const chartReferenceFeeGwei = isLiveRange
    ? oneHourAverageGwei
    : marketChart
      ? parseGwei(marketChart.summary.average_blob_base_fee_gwei)
      : undefined;

  const stripBlocks = useMemo(() => blocks.slice(0, HERO_STRIP_BLOCKS), [blocks]);
  // Long ranges return hundreds of chart buckets; merge them down to the
  // strip's bar capacity so the row never overflows the card.
  const stripBuckets = useMemo(
    () => (isLiveRange ? [] : groupChartPointsForStrip(marketChart?.points ?? [])),
    [isLiveRange, marketChart]
  );
  const stripItems = useMemo(() => {
    if (isLiveRange) {
      return buildBlockStripItems(stripBlocks);
    }
    return buildBucketStripItems(stripBuckets, isDayScaleRange(timeRange));
  }, [isLiveRange, stripBlocks, stripBuckets, timeRange]);
  const stripTargetPercent = useMemo(() => (
    isLiveRange
      ? getBlockStripTargetPercent(stripBlocks)
      : getBucketTargetPercent(marketChart?.points ?? [])
  ), [isLiveRange, stripBlocks, marketChart]);
  const stripCaption = isLiveRange
    ? `Last ${stripItems.length} blocks · click a bar for block details`
    : `${RANGE_LABELS[timeRange]} · ${
      marketChart
        ? getBucketStripHint(marketChart, stripBuckets)
        : 'utilization buckets'
    }`;

  // "Above target" follows the header time range: per-block counts on the
  // live 1h view; on 24h/7d/30d/All, true block counts from the stats window
  // when the backend provides them, otherwise range-chart bucket counts.
  const aboveTargetStat = useMemo(() => {
    if (isLiveRange) {
      const live = countBlocksAboveTarget(blocks);
      return { value: `${live.aboveCount}/${live.totalCount}`, hint: 'recent blocks' };
    }
    const windowSummary = getWindowAboveTargetSummary(
      rollingWindows,
      getRequestedRollingWindow(timeRange)
    );
    if (windowSummary) {
      return {
        value: `${windowSummary.aboveCount.toLocaleString()}/${windowSummary.totalCount.toLocaleString()}`,
        hint: `blocks · ${RANGE_LABELS[timeRange]}`,
      };
    }
    if (!marketChart || marketChart.points.length === 0) {
      return { value: '-', hint: RANGE_LABELS[timeRange] };
    }
    const bucketed = countChartPointsAboveTarget(marketChart.points);
    return {
      value: `${bucketed.aboveCount}/${bucketed.totalCount}`,
      hint: BUCKET_HINTS[marketChart.granularity] ?? `${marketChart.granularity} buckets`,
    };
  }, [isLiveRange, blocks, rollingWindows, marketChart, timeRange]);

  const direction = getDirectionStyle(rangeTrend?.direction);
  const DirectionIcon = direction.Icon;
  const now = useNow();

  return (
    <section aria-label="Live blob fee market">
      <DataStateWrapper
        isLoading={isLoading && !pricing}
        error={pricing ? null : error}
        loadingComponent={<HeroSkeleton />}
      >
        {pricing && (
          <article className="rounded-lg border border-divider bg-[#14161a] p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Right now */}
              <div className="lg:col-span-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-normal uppercase tracking-wide text-[#a9adb6]">
                      Blob base fee · {pricing.networkName}
                    </h2>
                    <LiveBadge pulseKey={headBlock?.blockNumber ?? 0} />
                  </div>
                  <InfoTooltip>
                    <InfoTooltipTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex cursor-help items-center gap-1.5 rounded-xs h-[18px] px-1.5 pt-px shrink-0 border font-mono text-[0.625rem] leading-6 ${direction.chipClass}`}
                        aria-label={`Fee direction over ${trendRangeLabel}: ${direction.label}`}
                      >
                        <DirectionIcon className="h-3 w-3" aria-hidden="true" />
                        {direction.label}
                        <span className="text-current/75">· {trendChipLabel}</span>
                      </button>
                    </InfoTooltipTrigger>
                    <InfoTooltipContent side="bottom" className="max-w-xs leading-relaxed">
                      {getDirectionExplanation(direction, rangeTrend?.deltaPercent, trendRangeLabel)}
                    </InfoTooltipContent>
                  </InfoTooltip>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    key={headBlock?.blockNumber ?? 'pending'}
                    className={`font-windsor-bold text-4xl text-white tabular-nums sm:text-5xl motion-reduce:animate-none ${feeTickClass}`}
                  >
                    {formatFeeNumber(currentFeeGwei)}
                  </span>
                  <span className="text-lg text-white">Gwei</span>
                </div>

                <div className="mt-2 space-y-1 text-sm text-[#a9adb6]">
                  {rangeTrend && (
                    <p>
                      <span
                        className={
                          rangeTrend.deltaPercent > 1
                            ? 'text-red-200'
                            : rangeTrend.deltaPercent < -1
                              ? 'text-green-200'
                              : ''
                        }
                      >
                        {formatSignedPercent(rangeTrend.deltaPercent)}
                      </span>
                      {' '}over {trendRangeLabel}
                    </p>
                  )}
                  <p>
                    Next block est. {formatFeeNumber(parseGwei(pricing.predictedNextFeeGwei))} Gwei (range {stripGweiUnit(pricing.marketPressure.nextBlockFeeEstimate.low)} – {stripGweiUnit(pricing.marketPressure.nextBlockFeeEstimate.high)})
                  </p>
                </div>

                {comparisons.length > 0 && (
                  <div className={`mt-4 grid gap-3 ${comparisons.length > 2 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                    {comparisons.map((comparison) => (
                      <ComparisonBadge
                        key={comparison.window}
                        label={comparison.label}
                        deltaPercent={comparison.deltaPercent}
                        averageGwei={comparison.averageGwei}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  <PressureStat
                    label="Above target"
                    value={aboveTargetStat.value}
                    hint={aboveTargetStat.hint}
                  />
                  <PressureStat
                    label="Full streak"
                    value={pricing.marketPressure.consecutiveFullBlocks.toLocaleString()}
                    hint="blocks in a row"
                  />
                  <PressureStat
                    label="At max"
                    value={formatPercent(pricing.marketPressure.percentRecentBlocksAtMaxBlobs, 0)}
                    hint="of recent blocks"
                  />
                  <PressureStat
                    label="Pending"
                    value={mempoolPressure ? mempoolPressure.pendingBlobCount.toLocaleString() : '-'}
                    hint={
                      mempoolPressure
                        ? `${mempoolPressure.includability.likelyIncludableCount} includable`
                        : 'mempool blobs'
                    }
                  />
                </div>
              </div>

              {/* Recent past */}
              <div className="lg:col-span-6 lg:col-start-7">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6e7687]">
                  <span>
                    {isLiveRange
                      ? `Blob base fee · ${RANGE_LABELS[timeRange]}`
                      : `Avg blob base fee · ${RANGE_LABELS[timeRange]}`}
                  </span>
                  {headBlock && (
                    <span>
                      Block{' '}
                      <Link
                        href={`/block/${headBlock.blockNumber}`}
                        className="text-blue hover:underline"
                      >
                        {headBlock.blockNumber.toLocaleString()}
                      </Link>{' '}
                      · {formatRelativeTime(headBlock.blockTimestamp, new Date(now))}
                    </span>
                  )}
                </div>
                <div className="h-44 sm:h-52">
                  {chartPoints.length > 1 ? (
                    <HeroFeeChart points={chartPoints} referenceFeeGwei={chartReferenceFeeGwei} />
                  ) : !isLiveRange && marketChartError ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6e7687]">
                      Couldn&apos;t load {RANGE_LABELS[timeRange]} fee history. The live view (1h) is unaffected.
                    </div>
                  ) : !isLiveRange && marketChartLoading ? (
                    <div className="h-full animate-pulse rounded bg-[#202538]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#6e7687]">
                      Waiting for block data…
                    </div>
                  )}
                </div>
                {chartReferenceFeeGwei !== undefined && chartReferenceFeeGwei > 0 && chartPoints.length > 1 && (
                  <p className="mt-1 text-right text-[11px] text-[#6e7687]">
                    <span className="text-purple">- - -</span> {isLiveRange ? '1h average' : 'range average'}
                  </p>
                )}
                <div className="mt-4">
                  {stripItems.length > 0 ? (
                    <BlockFullnessStrip
                      items={stripItems}
                      targetPercent={stripTargetPercent}
                      caption={stripCaption}
                    />
                  ) : !isLiveRange && marketChartLoading ? (
                    <div className="h-14 animate-pulse rounded bg-[#202538]" />
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        )}
      </DataStateWrapper>

      {pricing && error && (
        <p className="mt-3 text-xs text-red-300">
          Refresh failed: {error.message}. Showing the latest available market data.
        </p>
      )}
    </section>
  );
}
