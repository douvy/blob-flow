import type {
  AllTimeTotalsRecord,
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendBlobRecordsResponse,
  BackendBlobStreakBoard,
  BackendBlobStreakRun,
  BackendStatsWindow,
  BackendStatsWindowsResponse,
  BlobPricing,
  BlobRecords,
  BusiestHour,
  FeePeak,
  RollupMilestone,
  SpenderRecord,
  StatsResponse,
  StreakLeaderboard,
  StreakRecord,
  WindowFeeRecord,
  WindowThroughputRecord,
} from '../types';

/**
 * Source payloads the records are derived from. Each is the narrowest slice
 * of its endpoint's response that the derivation reads, and each is nullable
 * so a failed source degrades to missing sections instead of failing all of
 * them.
 *
 * `records` is the proposed GET /records endpoint carrying true historical
 * leaderboards (streaks, fee peaks, busiest hours). Until it ships every
 * backend 404s it, and the live pricing and rolling-window sources below
 * provide the fallback presentation.
 */
export interface BlobRecordSources {
  pricing: Pick<BlobPricing, 'marketPressure'> | null;
  statsWindows: Pick<BackendStatsWindowsResponse, 'windows'> | null;
  stats: StatsResponse | null;
  attribution: Pick<BackendAttributionUsageChartResponse, 'summary'> | null;
  records: Pick<
    BackendBlobRecordsResponse,
    'full_block_streaks' | 'above_target_streaks' | 'base_fee_peaks' | 'busiest_hours'
  > | null;
}

/**
 * Aggregate share buckets that are not a single entity. They are excluded
 * from entity records (spend ranking, milestones): "Unknown" reaching five
 * million blobs is not a milestone anyone celebrates.
 */
const AGGREGATE_SHARE_CATEGORIES = new Set(['other', 'unknown']);

/** How many entities the milestone board shows, largest blob counts first. */
export const MILESTONE_ENTITY_LIMIT = 8;

/** How many rows every top-N leaderboard keeps (streaks, peaks, spenders). */
export const RECORDS_TOP_LIMIT = 10;

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

function toStreakRun(run: BackendBlobStreakRun) {
  return {
    length: run.length,
    startBlock: run.start_block,
    endBlock: run.end_block,
    endTimestamp: run.end_timestamp,
  };
}

function deriveStreakLeaderboard(
  board: BackendBlobStreakBoard | undefined
): StreakLeaderboard | null {
  if (!board) return null;
  const top = (board.top ?? [])
    .slice()
    .sort((a, b) => b.length - a.length || b.end_block - a.end_block)
    .slice(0, RECORDS_TOP_LIMIT)
    .map(toStreakRun);
  return {
    current: board.current ? toStreakRun(board.current) : null,
    top,
  };
}

function deriveFeePeaks(
  records: BlobRecordSources['records']
): FeePeak[] | null {
  if (!records) return null;
  return (records.base_fee_peaks ?? [])
    .map((peak) => ({
      blockNumber: peak.block_number,
      timestamp: peak.timestamp,
      feeGwei:
        peak.blob_base_fee_gwei !== undefined && peak.blob_base_fee_gwei !== ''
          ? parseFinite(peak.blob_base_fee_gwei)
          : parseFinite(peak.blob_base_fee) / 1e9,
      blobCount: peak.blob_count,
    }))
    .sort((a, b) => b.feeGwei - a.feeGwei || b.blockNumber - a.blockNumber)
    .slice(0, RECORDS_TOP_LIMIT);
}

function deriveBusiestHours(
  records: BlobRecordSources['records']
): BusiestHour[] | null {
  if (!records) return null;
  return (records.busiest_hours ?? [])
    .map((hour) => ({
      hourStart: hour.hour_start,
      blobCount: hour.blob_count,
      totalCostWei: hour.total_cost_wei,
    }))
    .sort(
      (a, b) =>
        b.blobCount - a.blobCount || a.hourStart.localeCompare(b.hourStart)
    )
    .slice(0, RECORDS_TOP_LIMIT);
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

function deriveTopSpenders(
  attribution: BlobRecordSources['attribution']
): SpenderRecord[] {
  return entityShares(attribution)
    .slice()
    .sort((a, b) => {
      const difference =
        weiMagnitude(b.total_cost_wei) - weiMagnitude(a.total_cost_wei);
      return difference > BigInt(0) ? 1 : difference < BigInt(0) ? -1 : 0;
    })
    .slice(0, RECORDS_TOP_LIMIT)
    .map((share) => ({
      key: share.key,
      name: share.name,
      category: share.category,
      totalCostWei: share.total_cost_wei,
      spendSharePercent: share.spend_share_percent,
      blobCount: share.blob_count,
    }));
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
    fullBlockStreaks: deriveStreakLeaderboard(sources.records?.full_block_streaks),
    aboveTargetStreaks: deriveStreakLeaderboard(
      sources.records?.above_target_streaks
    ),
    feePeaks: deriveFeePeaks(sources.records),
    busiestHours: deriveBusiestHours(sources.records),
    peakWindowFee: derivePeakWindowFee(sources.statsWindows),
    busiestWindow: deriveBusiestWindow(sources.statsWindows),
    topSpenders: deriveTopSpenders(sources.attribution),
    allTime: deriveAllTime(sources.stats),
    milestones: deriveMilestones(sources.attribution),
  };
}
