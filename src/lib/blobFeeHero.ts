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
 * window is missing or the backend predates those fields, so callers can fall
 * back to bucket counting.
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
