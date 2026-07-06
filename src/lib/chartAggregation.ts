import { formatUnits } from 'viem';
import type { TimeRange } from '../contexts/TimeRangeContext';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartPoint,
  BackendBlobMarketChartResponse,
  BackendChartRange,
  BackendCostComparisonChartResponse,
  BackendStatsWindowsResponse,
  BaseFeeDataPoint,
  BlobPricing,
  ChartDataset,
  CostComparisonDataPoint,
  GasUtilizationDataPoint,
  Granularity,
  L2UsageDataPoint,
  L2UsageSeries,
  NetworkStats,
  RollingWindowDataPoint,
  RollingWindowKey,
} from '../types';

const WINDOW_LABELS: Record<RollingWindowKey, string> = {
  '5m': '5m',
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
};

const WINDOW_FALLBACK_ORDER: RollingWindowKey[] = ['30d', '7d', '24h', '1h', '5m'];
const PRICING_API_MAX_BLOCKS = 300;
const BLOB_GAS_PER_BLOB = 131_072;
const DAY_SECONDS = 86_400;
const HOUR_SECONDS = 3_600;
const ESTIMATED_BLOCKS_PER_RANGE: Record<TimeRange, number> = {
  '1h': 300,
  '24h': 7_200,
  '7d': 50_400,
  '30d': 216_000,
  All: 216_000,
};

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseFiniteNumber(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Pass through an optional non-negative count, dropping malformed values. */
function parseOptionalCount(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getInclusiveBlockCount(startBlock?: number, endBlock?: number): number {
  if (
    startBlock === undefined ||
    endBlock === undefined ||
    !Number.isFinite(startBlock) ||
    !Number.isFinite(endBlock) ||
    endBlock < startBlock
  ) {
    return 0;
  }

  return endBlock - startBlock + 1;
}

function deriveMaxBlobGasFromTarget(
  targetGas: number,
  startBlock?: number,
  endBlock?: number
): number {
  if (!Number.isFinite(targetGas) || targetGas <= 0) return 0;

  const blockCount = getInclusiveBlockCount(startBlock, endBlock);
  const targetGasPerBlock = blockCount > 0 ? targetGas / blockCount : targetGas;
  const targetBlobsPerBlock = targetGasPerBlock / BLOB_GAS_PER_BLOB;
  if (!Number.isFinite(targetBlobsPerBlock) || targetBlobsPerBlock <= 0) return 0;

  // Fallback for older chart payloads without `blob_gas_limit`: infer from
  // known target/max blob schedules, such as 3->6 and 14->21 blobs.
  const maxToTargetRatio = targetBlobsPerBlock <= 3 ? 2 : 1.5;
  return Math.round(targetGas * maxToTargetRatio);
}

function decimalWeiToGwei(value: string | undefined): number {
  return roundTo(parseFiniteNumber(value) / 1e9, 6);
}

function weiToEth(value: string | undefined): number {
  if (!value) return 0;

  const normalized = value.trim();
  if (normalized.includes('.')) {
    return parseFiniteNumber(normalized);
  }

  if (/^\d+$/.test(normalized)) {
    return Number(formatUnits(BigInt(normalized), 18));
  }

  return 0;
}

function weiIntegerToEth(value: string | undefined): number {
  if (!value) return 0;

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    return Number(formatUnits(BigInt(normalized), 18));
  }

  return parseFiniteNumber(normalized) / 1e18;
}

function isoTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatTwoDigit(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * How to label a chart bucket. Day-wide buckets never need the time; sub-day
 * buckets need the date whenever the plotted data spans more than one day,
 * otherwise identical-looking labels repeat across days (most visible while
 * the indexer backfills and a "30d" request covers only hours of data).
 */
export type BucketLabelStyle = 'day' | 'day-time' | 'time';

export function getBucketLabelStyle(bucketSeconds: number, spanMs: number): BucketLabelStyle {
  if (bucketSeconds >= DAY_SECONDS) return 'day';
  if (spanMs > DAY_SECONDS * 1000) return 'day-time';
  return 'time';
}

function formatBucketLabel(timestamp: string, style: BucketLabelStyle): string {
  const date = new Date(timestamp);
  const time = date.getTime();
  if (!Number.isFinite(time)) return timestamp;

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = formatTwoDigit(date.getUTCHours());
  const minute = formatTwoDigit(date.getUTCMinutes());

  if (style === 'day') return `${month}/${day}`;
  if (style === 'day-time') return `${month}/${day} ${hour}:${minute}`;
  return `${hour}:${minute}`;
}

const GRANULARITY_FALLBACK_SECONDS: Record<string, number> = {
  day: DAY_SECONDS,
  hour: HOUR_SECONDS,
  minute: 60,
};

/**
 * Bucket width in seconds. Prefers `bucket_seconds`; when it is missing or
 * invalid, falls back to the width implied by the `granularity` name (0 for
 * "block" and unknown granularities, whose width is not a fixed duration).
 */
export function getBucketWidthSeconds(
  response: Pick<BackendBlobMarketChartResponse, 'granularity' | 'bucket_seconds'>
): number {
  if (Number.isFinite(response.bucket_seconds) && response.bucket_seconds > 0) {
    return response.bucket_seconds;
  }
  return GRANULARITY_FALLBACK_SECONDS[response.granularity] ?? 0;
}

/**
 * Adjective for a bucket width in seconds, e.g. "hourly", "6-hour",
 * "5-minute". The backend `granularity` field names the aggregation table the
 * buckets came from ("hour"), not the actual bucket width, which only
 * `bucket_seconds` carries; captions must use this instead of `granularity`.
 */
export function describeBucketSpan(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds === DAY_SECONDS) return 'daily';
  if (seconds === HOUR_SECONDS) return 'hourly';
  if (seconds === 60) return 'minute';
  if (seconds % DAY_SECONDS === 0) return `${seconds / DAY_SECONDS}-day`;
  if (seconds % HOUR_SECONDS === 0) return `${seconds / HOUR_SECONDS}-hour`;
  if (seconds % 60 === 0) return `${seconds / 60}-minute`;
  return `${seconds}-second`;
}

/**
 * Wall-clock span actually covered by buckets that contain data. While the
 * indexer backfills, the backend returns the full requested window but only
 * the recently indexed tail is populated; labels and captions must describe
 * this real coverage rather than the advertised range.
 */
export interface ChartDataCoverage {
  /** Start of the earliest bucket with data. */
  startMs: number;
  /** End of the latest bucket with data (bucket start plus bucket width). */
  endMs: number;
  spanMs: number;
  /** True when data starts more than one bucket after the requested range start. */
  isPartial: boolean;
}

export function getChartDataCoverage(
  response: Pick<BackendBlobMarketChartResponse, 'start_time' | 'granularity' | 'bucket_seconds'>,
  points: Array<{ timestamp: string }>
): ChartDataCoverage | null {
  let firstMs = Number.POSITIVE_INFINITY;
  let lastMs = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const pointMs = isoTimestamp(point.timestamp);
    if (pointMs <= 0) continue;
    if (pointMs < firstMs) firstMs = pointMs;
    if (pointMs > lastMs) lastMs = pointMs;
  }
  if (!Number.isFinite(firstMs) || !Number.isFinite(lastMs)) return null;

  const bucketMs = getBucketWidthSeconds(response) * 1000;
  const requestedStartMs = isoTimestamp(response.start_time);
  const endMs = lastMs + bucketMs;

  return {
    startMs: firstMs,
    endMs,
    spanMs: endMs - firstMs,
    isPartial: requestedStartMs > 0 && firstMs - requestedStartMs > bucketMs,
  };
}

function formatWindowLabel(window: string): string {
  if (window in WINDOW_LABELS) {
    return WINDOW_LABELS[window as RollingWindowKey];
  }
  return window;
}

function getCurrentBaseFeeGwei(pricing: BlobPricing, baseFee: BaseFeeDataPoint[]): number {
  const current = parseFiniteNumber(pricing.currentBaseFeeGwei);
  if (current > 0) return roundTo(current, 6);

  const latest = baseFee[baseFee.length - 1];
  return latest?.baseFeeGwei ?? 0;
}

function formatBlockCoverage(
  recentBlockCount: number,
  timeRange: TimeRange,
  selectedWindow: RollingWindowDataPoint | null
): string {
  if (recentBlockCount === 0) return 'no pricing blocks in this view';

  const blockLabel = recentBlockCount === 1
    ? 'latest 1 pricing block'
    : `latest ${recentBlockCount.toLocaleString()} pricing blocks`;

  if (timeRange === 'All') return `${blockLabel} available from the pricing API`;
  if (selectedWindow) return `${blockLabel} within the ${selectedWindow.label} view`;
  return `${blockLabel} within the ${timeRange} view`;
}

function formatRollingCoverage(timeRange: TimeRange, selectedWindow: RollingWindowDataPoint | null): string {
  if (!selectedWindow) return 'rolling stats unavailable';

  if (timeRange === 'All') {
    return `All view uses the ${selectedWindow.label} rolling API window`;
  }

  if (selectedWindow.window !== timeRange) {
    return `${timeRange} view uses the ${selectedWindow.label} rolling API window`;
  }

  return `${selectedWindow.label} rolling API window`;
}

export function getRequestedRollingWindow(timeRange: TimeRange): RollingWindowKey {
  if (timeRange === 'All') return '30d';
  return timeRange;
}

export function getPricingBlockRequestLimit(timeRange: TimeRange): number {
  return Math.min(ESTIMATED_BLOCKS_PER_RANGE[timeRange], PRICING_API_MAX_BLOCKS);
}

export function getBackendChartRange(timeRange: TimeRange): BackendChartRange {
  return timeRange === 'All' ? '30d' : timeRange;
}

export function transformStatsWindows(
  statsWindows: BackendStatsWindowsResponse
): RollingWindowDataPoint[] {
  return statsWindows.windows
    .map((window) => {
      const averageBaseFeeWei = window.average_blob_base_fee_wei ?? window.average_blob_base_fee;
      const medianBaseFeeWei = window.median_blob_base_fee_wei ?? window.median_blob_base_fee;
      const p95BaseFeeWei = window.p95_blob_base_fee_wei ?? window.p95_blob_base_fee;
      const totalCostWei = window.total_cost_wei ?? window.total_cost_eth;

      return {
        window: window.window,
        label: formatWindowLabel(window.window),
        durationSeconds: window.duration_seconds,
        startTimestamp: isoTimestamp(window.start_time),
        endTimestamp: isoTimestamp(window.end_time),
        averageBaseFeeGwei: decimalWeiToGwei(averageBaseFeeWei),
        medianBaseFeeGwei: decimalWeiToGwei(medianBaseFeeWei),
        p95BaseFeeGwei: decimalWeiToGwei(p95BaseFeeWei),
        totalBlobs: window.total_blobs,
        totalBlobGasUsed: window.total_blob_gas_used,
        averageUtilizationPct: roundTo(parseFiniteNumber(window.average_utilization) * 100, 2),
        totalCostEth: weiToEth(totalCostWei),
        uniqueSenders: window.unique_senders,
        totalBlocks: parseOptionalCount(window.total_blocks),
        blocksAboveTarget: parseOptionalCount(window.blocks_above_target),
      };
    })
    .sort((a, b) => a.durationSeconds - b.durationSeconds);
}

export function selectRollingWindow(
  windows: RollingWindowDataPoint[],
  timeRange: TimeRange
): RollingWindowDataPoint | null {
  const requestedWindow = getRequestedRollingWindow(timeRange);
  const exactMatch = windows.find((window) => window.window === requestedWindow);
  if (exactMatch) return exactMatch;

  for (const fallback of WINDOW_FALLBACK_ORDER) {
    const fallbackMatch = windows.find((window) => window.window === fallback);
    if (fallbackMatch) return fallbackMatch;
  }

  return windows[windows.length - 1] ?? null;
}

function filterPricingForTimeRange(
  pricing: BlobPricing,
  timeRange: TimeRange,
  selectedWindow: RollingWindowDataPoint | null
): BlobPricing {
  if (timeRange === 'All' || !selectedWindow || selectedWindow.startTimestamp <= 0) {
    return pricing;
  }

  return {
    ...pricing,
    recentBlocks: pricing.recentBlocks.filter((block) => (
      isoTimestamp(block.blockTimestamp) >= selectedWindow.startTimestamp
    )),
  };
}

export function transformPricingBlocks(pricing: BlobPricing): {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
} {
  const sortedBlocks = [...pricing.recentBlocks].sort((a, b) => {
    const timestampDiff = isoTimestamp(a.blockTimestamp) - isoTimestamp(b.blockTimestamp);
    return timestampDiff !== 0 ? timestampDiff : a.blockNumber - b.blockNumber;
  });

  const baseFee = sortedBlocks.map((block) => ({
    timestamp: isoTimestamp(block.blockTimestamp),
    label: `#${block.blockNumber}`,
    baseFeeGwei: roundTo(parseFiniteNumber(block.blobBaseFeeGwei), 6),
    blockNumber: block.blockNumber,
  }));

  const gasUtilization = sortedBlocks.map((block) => {
    const targetGas = block.blobGasTarget || pricing.blobParams.targetGas;
    const utilizationPct =
      targetGas > 0
        ? roundTo((block.blobGasUsed / targetGas) * 100, 0)
        : roundTo(block.utilizationRatio * 100, 0);

    return {
      timestamp: isoTimestamp(block.blockTimestamp),
      label: `#${block.blockNumber}`,
      blockNumber: block.blockNumber,
      blobGasUsed: block.blobGasUsed,
      targetGas,
      maxGas: block.blobGasLimit || pricing.blobParams.maxGas,
      blobCount: block.blobCount,
      utilizationPct,
    };
  });

  return { baseFee, gasUtilization };
}

function formatChartRangeLabel(
  timeRange: TimeRange,
  selectedWindow: RollingWindowDataPoint | null
): string {
  if (timeRange === 'All' && selectedWindow?.window === '30d') return '30d view';
  if (timeRange === 'All') return 'all available history';
  if (selectedWindow) return `${selectedWindow.label} view`;
  return `${timeRange} view`;
}

function normalizeGranularity(granularity: string): Granularity {
  if (
    granularity === 'block' ||
    granularity === 'minute' ||
    granularity === 'hour' ||
    granularity === 'day'
  ) {
    return granularity;
  }

  return 'minute';
}

const NO_BUCKETS_COVERAGE_LABEL = 'no chart buckets in this view';

/** Shared shape of the bucketed chart responses, enough to caption coverage. */
interface BucketedChartResponse {
  range: BackendChartRange | string;
  granularity: string;
  bucket_seconds: number;
}

function formatBucketCoverage(
  chart: BucketedChartResponse,
  pointCount: number,
  timeRange: TimeRange,
  coverage: ChartDataCoverage | null
): string {
  if (pointCount === 0) return NO_BUCKETS_COVERAGE_LABEL;

  const bucketWidthSeconds = getBucketWidthSeconds(chart);
  const spanWord = describeBucketSpan(bucketWidthSeconds) ?? chart.granularity;
  const bucketLabel = pointCount === 1
    ? `1 ${spanWord} bucket`
    : `${pointCount.toLocaleString()} ${spanWord} buckets`;
  const rangeLabel = timeRange === 'All' && chart.range === '30d'
    ? '30d view'
    : timeRange === 'All'
      ? 'all available history'
      : `${timeRange} view`;

  // During a backfill the indexed data covers only the tail of the requested
  // range; say where it actually starts.
  const coverageNote = coverage?.isPartial
    ? ` (indexed data starts ${formatBucketLabel(
      new Date(coverage.startMs).toISOString(),
      bucketWidthSeconds >= DAY_SECONDS ? 'day' : 'day-time'
    )} UTC)`
    : '';

  return `${bucketLabel} over the ${rangeLabel}${coverageNote}`;
}

function buildSelectedWindowFromMarket(
  market: BackendBlobMarketChartResponse,
  timeRange: TimeRange
): RollingWindowDataPoint {
  const durationSeconds = Math.max(
    0,
    Math.round((isoTimestamp(market.end_time) - isoTimestamp(market.start_time)) / 1000)
  );

  const label = timeRange === 'All' && market.range === '30d' ? '30d' : timeRange;

  return {
    window: market.range,
    label,
    durationSeconds,
    startTimestamp: isoTimestamp(market.start_time),
    endTimestamp: isoTimestamp(market.end_time),
    averageBaseFeeGwei: roundTo(parseFiniteNumber(market.summary.average_blob_base_fee_gwei), 6),
    medianBaseFeeGwei: roundTo(parseFiniteNumber(market.summary.median_blob_base_fee_gwei), 6),
    p95BaseFeeGwei: roundTo(parseFiniteNumber(market.summary.p95_blob_base_fee_gwei), 6),
    totalBlobs: market.summary.total_blobs,
    totalBlobGasUsed: market.summary.total_blob_gas_used,
    averageUtilizationPct: roundTo(parseFiniteNumber(market.summary.average_utilization) * 100, 2),
    totalCostEth: weiIntegerToEth(market.summary.total_cost_wei),
    uniqueSenders: market.summary.unique_senders,
  };
}

/**
 * Buckets with no indexed blocks (typically the in-progress trailing minute,
 * or an indexer gap) report zero for every field. The blob base fee is never
 * zero on a real block (minimum 1 wei), so an all-zero bucket is missing data
 * and would plot as a false plunge to zero.
 */
export function marketPointHasData(point: BackendBlobMarketChartPoint): boolean {
  return (
    point.blob_count > 0 ||
    point.blob_gas_used > 0 ||
    parseFiniteNumber(point.average_blob_base_fee_gwei) > 0
  );
}

/**
 * Timestamps of market buckets with no indexed blocks. The attribution and
 * cost endpoints bucket the same window, so their points at these timestamps
 * are also missing data. Their payloads cannot make that call on their own:
 * an all-zero attribution or cost bucket can be a genuinely quiet interval,
 * but the market bucket still carries a nonzero base fee in that case.
 */
function collectEmptyBucketTimestamps(market: BackendBlobMarketChartResponse): Set<number> {
  const emptyTimestamps = new Set<number>();
  for (const point of market.points) {
    if (!marketPointHasData(point)) {
      emptyTimestamps.add(isoTimestamp(point.timestamp));
    }
  }
  return emptyTimestamps;
}

/**
 * The empty-bucket filter keys on exact timestamps, so it is only safe when
 * the other endpoint buckets identically to the market response. The three
 * responses are fetched and cached independently, so a mismatched snapshot
 * (for example a stale cache across a backend granularity change) must fail
 * open rather than drop a wider bucket that shares a start timestamp with
 * one empty market bucket.
 */
function sharesMarketBucketing(
  market: BackendBlobMarketChartResponse,
  other: { granularity: string; bucket_seconds: number }
): boolean {
  return (
    other.granularity === market.granularity &&
    other.bucket_seconds === market.bucket_seconds
  );
}

function transformMarketPoints(market: BackendBlobMarketChartResponse): {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
  coverage: ChartDataCoverage | null;
} {
  const sortedPoints = market.points.filter(marketPointHasData).sort((a, b) => {
    const timestampDiff = isoTimestamp(a.timestamp) - isoTimestamp(b.timestamp);
    return timestampDiff !== 0 ? timestampDiff : (a.end_block ?? 0) - (b.end_block ?? 0);
  });

  const coverage = getChartDataCoverage(market, sortedPoints);
  const labelStyle = getBucketLabelStyle(getBucketWidthSeconds(market), coverage?.spanMs ?? 0);

  const baseFee = sortedPoints.map((point) => ({
    timestamp: isoTimestamp(point.timestamp),
    label: point.label ?? (
      market.granularity === 'block' && point.end_block
        ? `#${point.end_block}`
        : formatBucketLabel(point.timestamp, labelStyle)
    ),
    baseFeeGwei: roundTo(parseFiniteNumber(point.average_blob_base_fee_gwei), 6),
    blockNumber: point.end_block,
  }));

  const gasUtilization = sortedPoints.map((point) => {
    const explicitMaxGas = parseFiniteNumber(point.blob_gas_limit);
    const maxGas =
      explicitMaxGas > 0
        ? explicitMaxGas
        : deriveMaxBlobGasFromTarget(point.blob_gas_target, point.start_block, point.end_block);

    return {
      timestamp: isoTimestamp(point.timestamp),
      label: point.label ?? (
        market.granularity === 'block' && point.end_block
          ? `#${point.end_block}`
          : formatBucketLabel(point.timestamp, labelStyle)
      ),
      blockNumber: point.end_block ?? point.start_block ?? 0,
      blobGasUsed: point.blob_gas_used,
      targetGas: point.blob_gas_target,
      maxGas,
      blobCount: point.blob_count,
      utilizationPct: roundTo(parseFiniteNumber(point.average_utilization) * 100, 0),
    };
  });

  return { baseFee, gasUtilization, coverage };
}

/**
 * Drop buckets that predate the indexed data coverage (from the market
 * chart). During a backfill the backend returns the full requested window,
 * and buckets before the earliest indexed block would plot as false zeros.
 * These endpoints are not guaranteed to bucket identically to the market
 * chart, so a bucket survives if any part of it overlaps the coverage.
 */
function filterToCoverage<T extends { timestamp: string }>(
  points: T[],
  coverageStartMs: number | undefined,
  bucketWidthMs: number
): T[] {
  if (coverageStartMs === undefined) return points;
  return points.filter((point) => {
    const startMs = isoTimestamp(point.timestamp);
    return startMs >= coverageStartMs || startMs + bucketWidthMs > coverageStartMs;
  });
}

function transformAttributionUsage(
  attribution: BackendAttributionUsageChartResponse,
  emptyBucketTimestamps: Set<number>,
  coverageStartMs?: number
): {
  l2Usage: L2UsageDataPoint[];
  l2UsageSeries: L2UsageSeries[];
  coverage: ChartDataCoverage | null;
} {
  const l2UsageSeries = attribution.series.map((series) => ({
    key: series.key,
    name: series.name,
    category: series.category,
    address: series.address,
  }));

  const bucketWidthSeconds = getBucketWidthSeconds(attribution);
  const points = filterToCoverage(
    attribution.points.filter(
      (point) => !emptyBucketTimestamps.has(isoTimestamp(point.timestamp))
    ),
    coverageStartMs,
    bucketWidthSeconds * 1000
  );
  const coverage = getChartDataCoverage(attribution, points);
  const labelStyle = getBucketLabelStyle(bucketWidthSeconds, coverage?.spanMs ?? 0);

  const l2Usage = points.map((point) => {
    const row: L2UsageDataPoint = {
      timestamp: isoTimestamp(point.timestamp),
      label: formatBucketLabel(point.timestamp, labelStyle),
      total: 0,
    };

    for (const series of l2UsageSeries) {
      const blobCount = point.values[series.key]?.blob_count ?? 0;
      row[series.key] = blobCount;
      row.total += blobCount;
    }

    return row;
  });

  return { l2Usage, l2UsageSeries, coverage };
}

function transformCostComparison(
  costComparison: BackendCostComparisonChartResponse,
  emptyBucketTimestamps: Set<number>,
  coverageStartMs?: number
): { points: CostComparisonDataPoint[]; coverage: ChartDataCoverage | null } {
  const bucketWidthSeconds = getBucketWidthSeconds(costComparison);
  const points = filterToCoverage(
    costComparison.points.filter(
      (point) => !emptyBucketTimestamps.has(isoTimestamp(point.timestamp))
    ),
    coverageStartMs,
    bucketWidthSeconds * 1000
  );
  const coverage = getChartDataCoverage(costComparison, points);
  const labelStyle = getBucketLabelStyle(bucketWidthSeconds, coverage?.spanMs ?? 0);

  return {
    points: points.map((point) => ({
      timestamp: isoTimestamp(point.timestamp),
      label: formatBucketLabel(point.timestamp, labelStyle),
      blobCostEth: weiIntegerToEth(point.blob_cost_wei),
      calldataEquivEth: weiIntegerToEth(point.calldata_equivalent_cost_wei),
      savingsPct: roundTo(point.savings_percent, 2),
    })),
    coverage,
  };
}

export function buildChartDatasetFromResponses(
  market: BackendBlobMarketChartResponse,
  attribution: BackendAttributionUsageChartResponse,
  costComparison: BackendCostComparisonChartResponse,
  timeRange: TimeRange,
  stats?: NetworkStats,
  statsWindows?: BackendStatsWindowsResponse
): ChartDataset {
  const rollingWindows = statsWindows ? transformStatsWindows(statsWindows) : [];
  const selectedWindow =
    selectRollingWindow(rollingWindows, timeRange) ??
    buildSelectedWindowFromMarket(market, timeRange);
  const { baseFee, gasUtilization, coverage } = transformMarketPoints(market);
  const emptyBucketTimestamps = collectEmptyBucketTimestamps(market);
  const noFilter = new Set<number>();
  const { l2Usage, l2UsageSeries, coverage: l2UsageCoverage } = transformAttributionUsage(
    attribution,
    sharesMarketBucketing(market, attribution) ? emptyBucketTimestamps : noFilter,
    coverage?.startMs
  );
  const { points: costComparisonData, coverage: costComparisonCoverage } = transformCostComparison(
    costComparison,
    sharesMarketBucketing(market, costComparison) ? emptyBucketTimestamps : noFilter,
    coverage?.startMs
  );
  const currentBaseFeeGwei = roundTo(parseFiniteNumber(market.summary.current_base_fee_gwei), 6);
  const averageBaseFeeGwei = selectedWindow.averageBaseFeeGwei;
  const rollingCoverageLabel = statsWindows
    ? formatRollingCoverage(timeRange, selectedWindow)
    : `${selectedWindow.label} chart summary`;
  const blockCoverageLabel = formatBucketCoverage(market, baseFee.length, timeRange, coverage);
  const l2UsageCoverageLabel = formatBucketCoverage(
    attribution,
    l2Usage.length,
    timeRange,
    l2UsageCoverage
  );
  const costComparisonCoverageLabel = formatBucketCoverage(
    costComparison,
    costComparisonData.length,
    timeRange,
    costComparisonCoverage
  );
  const chartRangeLabel = formatChartRangeLabel(timeRange, selectedWindow);

  return {
    baseFee,
    gasUtilization,
    l2Usage,
    l2UsageSeries,
    costComparison: costComparisonData,
    rollingWindows: rollingWindows.length > 0 ? rollingWindows : [selectedWindow],
    selectedWindow,
    indicators: {
      currentBaseFeeGwei,
      averageBaseFeeGwei,
      feeRatio:
        averageBaseFeeGwei > 0
          ? roundTo(currentBaseFeeGwei / averageBaseFeeGwei, 2)
          : 1,
      pendingBlobCount: stats?.pendingBlobsCount ?? 0,
      recentBaseFeeSparkline: baseFee.slice(-12).map((point) => point.baseFeeGwei),
    },
    granularity: normalizeGranularity(market.granularity),
    recentBlockCount: baseFee.length,
    chartRangeLabel,
    rollingCoverageLabel,
    blockCoverageLabel,
    l2UsageCoverageLabel,
    costComparisonCoverageLabel,
    coverageLabel: `${rollingCoverageLabel}; fee and utilization charts show ${blockCoverageLabel}.`,
  };
}

export function buildChartDataset(
  statsWindows: BackendStatsWindowsResponse,
  pricing: BlobPricing,
  timeRange: TimeRange,
  stats?: NetworkStats
): ChartDataset {
  const rollingWindows = transformStatsWindows(statsWindows);
  const selectedWindow = selectRollingWindow(rollingWindows, timeRange);
  const windowedPricing = filterPricingForTimeRange(pricing, timeRange, selectedWindow);
  const { baseFee, gasUtilization } = transformPricingBlocks(windowedPricing);
  const currentBaseFeeGwei = getCurrentBaseFeeGwei(pricing, baseFee);
  const averageBaseFeeGwei =
    selectedWindow?.averageBaseFeeGwei ??
    (baseFee.length > 0
      ? baseFee.reduce((sum, point) => sum + point.baseFeeGwei, 0) / baseFee.length
      : 0);
  const rollingCoverageLabel = formatRollingCoverage(timeRange, selectedWindow);
  const blockCoverageLabel = formatBlockCoverage(windowedPricing.recentBlocks.length, timeRange, selectedWindow);
  const chartRangeLabel = formatChartRangeLabel(timeRange, selectedWindow);

  return {
    baseFee,
    gasUtilization,
    l2Usage: [],
    l2UsageSeries: [],
    costComparison: [],
    rollingWindows,
    selectedWindow,
    indicators: {
      currentBaseFeeGwei,
      averageBaseFeeGwei: roundTo(averageBaseFeeGwei, 6),
      feeRatio:
        averageBaseFeeGwei > 0
          ? roundTo(currentBaseFeeGwei / averageBaseFeeGwei, 2)
          : 1,
      pendingBlobCount: stats?.pendingBlobsCount ?? 0,
      recentBaseFeeSparkline: baseFee.slice(-12).map((point) => point.baseFeeGwei),
    },
    granularity: 'block',
    recentBlockCount: windowedPricing.recentBlocks.length,
    chartRangeLabel,
    rollingCoverageLabel,
    blockCoverageLabel,
    l2UsageCoverageLabel: NO_BUCKETS_COVERAGE_LABEL,
    costComparisonCoverageLabel: NO_BUCKETS_COVERAGE_LABEL,
    coverageLabel: `${rollingCoverageLabel}; fee and utilization charts show the ${blockCoverageLabel}.`,
  };
}
