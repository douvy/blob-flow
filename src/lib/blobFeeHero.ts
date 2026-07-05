import type {
  BackendBlobMarketChartPoint,
  BlobPricingRecentBlock,
  RollingWindowDataPoint,
} from '@/types';

/** Number of recent blocks shown in the hero fee chart (~20 min of mainnet blocks). */
export const HERO_CHART_BLOCKS = 100;
/** Number of recent blocks shown in the hero fullness strip. */
export const HERO_STRIP_BLOCKS = 24;
/** Blocks to look back when computing the short-term fee trend (~2 min). */
export const HERO_TREND_LOOKBACK_BLOCKS = 10;

/**
 * Merge fetched pricing blocks with blocks accumulated from `new_block`
 * WebSocket events. Returns blocks newest-first, deduped by block number
 * (fetched records win on conflict), capped at `cap`.
 */
export function mergeRecentPricingBlocks(
  fetched: BlobPricingRecentBlock[],
  live: BlobPricingRecentBlock[],
  cap = HERO_CHART_BLOCKS
): BlobPricingRecentBlock[] {
  const byNumber = new Map<number, BlobPricingRecentBlock>();

  for (const block of fetched) {
    byNumber.set(block.blockNumber, block);
  }

  for (const block of live) {
    if (!byNumber.has(block.blockNumber)) {
      byNumber.set(block.blockNumber, block);
    }
  }

  return Array.from(byNumber.values())
    .sort((left, right) => right.blockNumber - left.blockNumber)
    .slice(0, cap);
}

export interface AboveTargetSummary {
  aboveCount: number;
  totalCount: number;
}

/** Count blocks flagged above the per-block blob target (live 1h hero view). */
export function countBlocksAboveTarget(blocks: BlobPricingRecentBlock[]): AboveTargetSummary {
  return {
    aboveCount: blocks.filter((block) => block.isAboveTarget).length,
    totalCount: blocks.length,
  };
}

/**
 * Block-level above-target counts for a rolling window, when the stats API
 * provides them (`total_blocks`/`blocks_above_target`). Returns null when the
 * window is missing, the backend predates those fields, or the window reports
 * no indexed blocks, so callers can fall back to bucket counting.
 */
export function getWindowAboveTargetSummary(
  windows: RollingWindowDataPoint[],
  windowKey: string
): AboveTargetSummary | null {
  const match = windows.find((window) => window.window === windowKey);
  if (
    !match ||
    match.totalBlocks === undefined ||
    match.totalBlocks <= 0 ||
    match.blocksAboveTarget === undefined
  ) {
    return null;
  }

  return { aboveCount: match.blocksAboveTarget, totalCount: match.totalBlocks };
}

/**
 * Count bucketed chart points whose blob gas usage exceeds the bucket's
 * target (24h/7d/30d hero views).
 */
export function countChartPointsAboveTarget(
  points: BackendBlobMarketChartPoint[]
): AboveTargetSummary {
  return {
    aboveCount: points.filter(
      (point) => point.blob_gas_target > 0 && point.blob_gas_used > point.blob_gas_target
    ).length,
    totalCount: points.length,
  };
}

export function parseGwei(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** A hero-strip bar: one chart bucket, or several consecutive buckets merged. */
export interface HeroStripBucket extends BackendBlobMarketChartPoint {
  /** Timestamp of the last merged bucket (equals `timestamp` for a single bucket). */
  end_timestamp: string;
  /** How many chart buckets this bar covers. */
  bucket_count: number;
}

/**
 * Merge consecutive chart buckets so the hero fullness strip renders at most
 * `maxItems` bars; long ranges return hundreds of buckets, far more than the
 * strip can fit. Blob and gas counts are summed; `blob_gas_limit` survives
 * only when every merged bucket reports one, mirroring the fill-percent
 * fallback to `average_utilization`, which is averaged. Fee fields are
 * averaged as an approximation; the strip does not display them.
 */
export function groupChartPointsForStrip(
  points: BackendBlobMarketChartPoint[],
  maxItems = HERO_STRIP_BLOCKS
): HeroStripBucket[] {
  if (points.length === 0 || maxItems < 1) return [];

  // Balanced partition: group sizes differ by at most one, so a just-over-limit
  // response (say 25 points) still fills the strip instead of collapsing to
  // half the bars. The remainder goes to the oldest (leftmost) bars.
  const groupCount = Math.min(maxItems, points.length);
  const baseSize = Math.floor(points.length / groupCount);
  let remainder = points.length % groupCount;

  const groups: HeroStripBucket[] = [];
  let start = 0;
  while (start < points.length) {
    const size = remainder > 0 ? baseSize + 1 : baseSize;
    if (remainder > 0) remainder -= 1;
    groups.push(mergeStripBuckets(points.slice(start, start + size)));
    start += size;
  }

  return groups;
}

function mergeStripBuckets(buckets: BackendBlobMarketChartPoint[]): HeroStripBucket {
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  if (buckets.length === 1) {
    return { ...first, end_timestamp: first.timestamp, bucket_count: 1 };
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  const hasCompleteLimits = buckets.every(
    (bucket) => bucket.blob_gas_limit !== undefined && bucket.blob_gas_limit > 0
  );
  const totalCostWei = buckets.reduce((total, bucket) => {
    const cost = bucket.total_cost_wei?.trim() ?? '';
    return /^\d+$/.test(cost) ? total + BigInt(cost) : total;
  }, BigInt(0));

  return {
    timestamp: first.timestamp,
    end_timestamp: last.timestamp,
    bucket_count: buckets.length,
    start_block: buckets.find((bucket) => bucket.start_block !== undefined)?.start_block,
    end_block: buckets
      .slice()
      .reverse()
      .find((bucket) => bucket.end_block !== undefined)?.end_block,
    average_blob_base_fee_gwei: String(
      mean(buckets.map((bucket) => parseGwei(bucket.average_blob_base_fee_gwei)))
    ),
    median_blob_base_fee_gwei: String(
      mean(buckets.map((bucket) => parseGwei(bucket.median_blob_base_fee_gwei)))
    ),
    p95_blob_base_fee_gwei: String(
      mean(buckets.map((bucket) => parseGwei(bucket.p95_blob_base_fee_gwei)))
    ),
    blob_count: sum(buckets.map((bucket) => bucket.blob_count)),
    blob_gas_used: sum(buckets.map((bucket) => bucket.blob_gas_used)),
    blob_gas_target: sum(buckets.map((bucket) => bucket.blob_gas_target)),
    blob_gas_limit: hasCompleteLimits
      ? sum(buckets.map((bucket) => bucket.blob_gas_limit ?? 0))
      : undefined,
    average_utilization: String(
      mean(buckets.map((bucket) => parseGwei(bucket.average_utilization)))
    ),
    total_cost_wei: totalCostWei.toString(),
    unique_senders: Math.max(...buckets.map((bucket) => bucket.unique_senders)),
  };
}

export interface FeeTrend {
  /** Percent change of the newest block fee vs `comparedBlocks` blocks ago. */
  deltaPercent: number;
  comparedBlocks: number;
}

export type FeeTrendDirection = 'up' | 'down' | 'stable';

export interface FeeRangeTrend {
  /** Percent change from the first positive fee in the range to the last. */
  deltaPercent: number;
  direction: FeeTrendDirection;
}

/**
 * Short-term fee movement over the most recent blocks. `blocks` must be
 * newest-first. Returns null when there is not enough data or the baseline
 * fee is zero.
 */
export function computeFeeTrend(
  blocks: BlobPricingRecentBlock[],
  lookback = HERO_TREND_LOOKBACK_BLOCKS
): FeeTrend | null {
  if (blocks.length < 2) return null;

  const comparedBlocks = Math.min(lookback, blocks.length - 1);
  const currentFee = parseGwei(blocks[0].blobBaseFeeGwei);
  const pastFee = parseGwei(blocks[comparedBlocks].blobBaseFeeGwei);
  if (pastFee <= 0) return null;

  return {
    deltaPercent: ((currentFee - pastFee) / pastFee) * 100,
    comparedBlocks,
  };
}

/**
 * Fee movement across the currently displayed range. `fees` must be oldest
 * first. Zero/missing fees are skipped because they cannot be used as a
 * percent-change baseline.
 */
export function computeFeeRangeTrend(
  fees: Array<number | string | undefined>,
  thresholdPercent = 1
): FeeRangeTrend | null {
  const positiveFees = fees.map(parseGwei).filter((fee) => fee > 0);
  if (positiveFees.length < 2) return null;

  const firstFee = positiveFees[0];
  const lastFee = positiveFees[positiveFees.length - 1];
  const deltaPercent = ((lastFee - firstFee) / firstFee) * 100;

  return {
    deltaPercent,
    direction:
      deltaPercent > thresholdPercent
        ? 'up'
        : deltaPercent < -thresholdPercent
          ? 'down'
          : 'stable',
  };
}

export interface WindowComparison {
  window: string;
  label: string;
  averageGwei: number;
  /** Percent the current fee sits above (+) or below (-) the window average. */
  deltaPercent: number;
}

/**
 * Compare the current fee against rolling-window averages (e.g. 1h, 24h).
 * Windows without a positive average are skipped.
 */
export function compareToWindows(
  currentFeeGwei: number,
  windows: RollingWindowDataPoint[]
): WindowComparison[] {
  return windows
    .filter((window) => window.averageBaseFeeGwei > 0)
    .map((window) => ({
      window: String(window.window),
      label: window.label,
      averageGwei: window.averageBaseFeeGwei,
      deltaPercent: (currentFeeGwei / window.averageBaseFeeGwei - 1) * 100,
    }));
}

/** Format a gwei fee for display without unit, keeping it readable at any magnitude. */
export function formatFeeNumber(gwei: number): string {
  if (!Number.isFinite(gwei) || gwei <= 0) return '0';

  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
    maximumFractionDigits: 9,
  }).format(gwei);
}

/** Signed percent label, e.g. "+212%" or "-38.3%". Rounds half away from zero. */
export function formatSignedPercent(value: number): string {
  const scale = Math.abs(value) >= 100 ? 1 : 10;
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * scale)) / scale;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}
