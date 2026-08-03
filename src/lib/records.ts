import type {
  AllTimeTotalsRecord,
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendStatsWindow,
  BackendStatsWindowsResponse,
  BlobPricing,
  BlobRecords,
  RollupMilestone,
  SpenderRecord,
  StatsResponse,
  StreakRecord,
  WindowFeeRecord,
  WindowThroughputRecord,
} from '../types';

/**
 * Source payloads the records are derived from. Each is the narrowest slice
 * of its endpoint's response that the derivation reads, and each is nullable
 * so a failed source degrades to missing sections instead of failing all of
 * them. When the backend grows a dedicated records endpoint, only
 * getBlobRecords (src/lib/api/records.ts) needs to change; this derivation
 * and everything above it can be retired or kept as a fallback.
 */
export interface BlobRecordSources {
  pricing: Pick<BlobPricing, 'marketPressure'> | null;
  statsWindows: Pick<BackendStatsWindowsResponse, 'windows'> | null;
  stats: StatsResponse | null;
  attribution: Pick<BackendAttributionUsageChartResponse, 'summary'> | null;
}

/**
 * Aggregate share buckets that are not a single entity. They are excluded
 * from entity records (biggest spender, milestones): "Unknown" reaching five
 * million blobs is not a milestone anyone celebrates.
 */
const AGGREGATE_SHARE_CATEGORIES = new Set(['other', 'unknown']);

/** How many entities the milestone board shows, largest blob counts first. */
export const MILESTONE_ENTITY_LIMIT = 8;

const MILESTONE_STEPS = [1, 2, 5];
const SECONDS_PER_HOUR = 3600;

/**
 * The next round blob-count milestone strictly above the given count, from
 * the 1/2/5 ladder (10, 20, 50, 100, ... 1M, 2M, 5M, 10M, ...).
 */
export function nextBlobMilestone(count: number): number {
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  let magnitude = 10;
  for (;;) {
    for (const step of MILESTONE_STEPS) {
      const candidate = step * magnitude;
      if (candidate > safeCount) return candidate;
    }
    magnitude *= 10;
  }
}

function parseFinite(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** p95 base fee of a window in Gwei. Both backend fields are wei-denominated. */
function windowP95Gwei(window: BackendStatsWindow): number {
  return parseFinite(window.p95_blob_base_fee_wei ?? window.p95_blob_base_fee) / 1e9;
}

/** Integer wei magnitude for comparisons; malformed strings compare as zero. */
function weiMagnitude(value: string | undefined): bigint {
  const integerPart = (value ?? '').split('.')[0];
  return /^\d+$/.test(integerPart) ? BigInt(integerPart) : BigInt(0);
}

function deriveStreak(pricing: BlobRecordSources['pricing']): StreakRecord | null {
  if (!pricing) return null;
  const pressure = pricing.marketPressure;
  return {
    consecutiveFullBlocks: pressure.consecutiveFullBlocks,
    recentBlocksAboveTarget: pressure.recentBlocksAboveTarget,
    percentRecentBlocksAtMaxBlobs: pressure.percentRecentBlocksAtMaxBlobs,
  };
}

function derivePeakWindowFee(
  statsWindows: BlobRecordSources['statsWindows']
): WindowFeeRecord | null {
  const windows = statsWindows?.windows ?? [];
  if (windows.length === 0) return null;

  const perWindow = windows.map((window) => ({
    window: window.window,
    p95Gwei: windowP95Gwei(window),
  }));

  const peak = perWindow.reduce((best, entry) =>
    entry.p95Gwei > best.p95Gwei ? entry : best
  );

  return { ...peak, perWindow };
}

function deriveBusiestWindow(
  statsWindows: BlobRecordSources['statsWindows']
): WindowThroughputRecord | null {
  const perWindow = (statsWindows?.windows ?? [])
    .filter((window) => window.duration_seconds > 0)
    .map((window) => ({
      window: window.window,
      totalBlobs: window.total_blobs,
      blobsPerHour: (window.total_blobs * SECONDS_PER_HOUR) / window.duration_seconds,
    }));

  if (perWindow.length === 0) return null;

  const busiest = perWindow.reduce((best, entry) =>
    entry.blobsPerHour > best.blobsPerHour ? entry : best
  );

  return { ...busiest, perWindow };
}

function entityShares(
  attribution: BlobRecordSources['attribution']
): BackendAttributionUsageShare[] {
  return (attribution?.summary.shares ?? []).filter(
    (share) => !AGGREGATE_SHARE_CATEGORIES.has(share.category)
  );
}

function deriveBiggestSpender(
  attribution: BlobRecordSources['attribution']
): SpenderRecord | null {
  const shares = entityShares(attribution);
  if (shares.length === 0) return null;

  const biggest = shares.reduce((best, share) =>
    weiMagnitude(share.total_cost_wei) > weiMagnitude(best.total_cost_wei) ? share : best
  );

  return {
    key: biggest.key,
    name: biggest.name,
    category: biggest.category,
    totalCostWei: biggest.total_cost_wei,
    spendSharePercent: biggest.spend_share_percent,
    blobCount: biggest.blob_count,
  };
}

function deriveMilestones(
  attribution: BlobRecordSources['attribution']
): RollupMilestone[] {
  return entityShares(attribution)
    .slice()
    .sort((a, b) => b.blob_count - a.blob_count)
    .slice(0, MILESTONE_ENTITY_LIMIT)
    .map((share) => {
      const nextMilestone = nextBlobMilestone(share.blob_count);
      return {
        key: share.key,
        name: share.name,
        category: share.category,
        blobCount: share.blob_count,
        blobSharePercent: share.blob_share_percent,
        nextMilestone,
        remainingToMilestone: nextMilestone - share.blob_count,
        progressPercent: (share.blob_count / nextMilestone) * 100,
      };
    });
}

function deriveAllTime(stats: BlobRecordSources['stats']): AllTimeTotalsRecord | null {
  if (!stats) return null;
  return {
    totalBlobs: stats.data.totalBlobs,
    averageBaseFee: stats.data.averageBaseFee,
  };
}

/** Derive every record section from whichever sources are available. */
export function deriveBlobRecords(sources: BlobRecordSources): BlobRecords {
  return {
    streak: deriveStreak(sources.pricing),
    peakWindowFee: derivePeakWindowFee(sources.statsWindows),
    busiestWindow: deriveBusiestWindow(sources.statsWindows),
    biggestSpender: deriveBiggestSpender(sources.attribution),
    allTime: deriveAllTime(sources.stats),
    milestones: deriveMilestones(sources.attribution),
  };
}
