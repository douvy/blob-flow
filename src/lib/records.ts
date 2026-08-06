import type {
  AllTimeTotalsRecord,
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendBlobRecordsResponse,
  BackendBlobStreakBoard,
  BackendBlobStreakRun,
  BlobRecords,
  BusiestDay,
  BusiestHour,
  ExpensiveBlock,
  FeePeak,
  RollupMilestone,
  SpenderRecord,
  StatsResponse,
  StreakLeaderboard,
  UtilizationDay,
} from '../types';

/**
 * Source payloads the records are derived from: GET /records for the
 * historical leaderboards, all-time attribution shares for the entity spend
 * ranking and milestones, and /stats for the totals card. Each is the
 * narrowest slice of its endpoint's response that the derivation reads.
 */
export interface BlobRecordSources {
  stats: StatsResponse;
  attribution: Pick<BackendAttributionUsageChartResponse, 'summary' | 'points'>;
  records: Pick<
    BackendBlobRecordsResponse,
    | 'full_block_streaks'
    | 'above_target_streaks'
    | 'below_target_streaks'
    | 'base_fee_peaks'
    | 'most_expensive_blocks'
    | 'busiest_hours'
    | 'busiest_days'
    | 'highest_utilization_days'
  >;
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

/** Integer wei magnitude for comparisons; malformed strings compare as zero. */
function weiMagnitude(value: string | undefined): bigint {
  const integerPart = (value ?? '').split('.')[0];
  return /^\d+$/.test(integerPart) ? BigInt(integerPart) : BigInt(0);
}

function compareWeiDesc(a: string | undefined, b: string | undefined): number {
  const difference = weiMagnitude(b) - weiMagnitude(a);
  return difference > BigInt(0) ? 1 : difference < BigInt(0) ? -1 : 0;
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
  board: BackendBlobStreakBoard
): StreakLeaderboard {
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

function deriveFeePeaks(records: BlobRecordSources['records']): FeePeak[] {
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

function deriveExpensiveBlocks(
  records: BlobRecordSources['records']
): ExpensiveBlock[] {
  return (records.most_expensive_blocks ?? [])
    .map((block) => ({
      blockNumber: block.block_number,
      timestamp: block.timestamp,
      totalCostWei: block.total_cost_wei,
      blobCount: block.blob_count,
    }))
    .sort(
      (a, b) =>
        compareWeiDesc(a.totalCostWei, b.totalCostWei) ||
        b.blockNumber - a.blockNumber
    )
    .slice(0, RECORDS_TOP_LIMIT);
}

function deriveBusiestHours(
  records: BlobRecordSources['records']
): BusiestHour[] {
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

function deriveBusiestDays(records: BlobRecordSources['records']): BusiestDay[] {
  return (records.busiest_days ?? [])
    .map((day) => ({
      dayStart: day.day_start,
      blobCount: day.blob_count,
      totalCostWei: day.total_cost_wei,
    }))
    .sort(
      (a, b) => b.blobCount - a.blobCount || a.dayStart.localeCompare(b.dayStart)
    )
    .slice(0, RECORDS_TOP_LIMIT);
}

/**
 * UTC days ranked by total blob spend, summed across every attribution
 * series (including the Unknown and Other buckets, so the totals cover the
 * whole network). Derived from the attribution day buckets because GET
 * /records has no spend-per-day list.
 */
function derivePriciestDays(
  attribution: BlobRecordSources['attribution']
): BusiestDay[] {
  return (attribution.points ?? [])
    .map((point) => {
      let totalCostWei = BigInt(0);
      let blobCount = 0;
      for (const value of Object.values(point.values)) {
        totalCostWei += weiMagnitude(value.total_cost_wei);
        blobCount += value.blob_count;
      }
      return {
        dayStart: point.timestamp,
        blobCount,
        totalCostWei: totalCostWei.toString(),
      };
    })
    .sort(
      (a, b) =>
        compareWeiDesc(a.totalCostWei, b.totalCostWei) ||
        a.dayStart.localeCompare(b.dayStart)
    )
    .slice(0, RECORDS_TOP_LIMIT);
}

function deriveUtilizationDays(
  records: BlobRecordSources['records']
): UtilizationDay[] {
  return (records.highest_utilization_days ?? [])
    .map((day) => ({
      dayStart: day.day_start,
      averageUtilizationPercent: day.average_utilization_percent,
      blockCount: day.block_count,
      blobCount: day.blob_count,
    }))
    .sort(
      (a, b) =>
        b.averageUtilizationPercent - a.averageUtilizationPercent ||
        a.dayStart.localeCompare(b.dayStart)
    )
    .slice(0, RECORDS_TOP_LIMIT);
}

function entityShares(
  attribution: BlobRecordSources['attribution']
): BackendAttributionUsageShare[] {
  return (attribution.summary.shares ?? []).filter(
    (share) => !AGGREGATE_SHARE_CATEGORIES.has(share.category)
  );
}

function deriveTopSpenders(
  attribution: BlobRecordSources['attribution']
): SpenderRecord[] {
  return entityShares(attribution)
    .slice()
    .sort((a, b) => compareWeiDesc(a.total_cost_wei, b.total_cost_wei))
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

function deriveAllTime(stats: BlobRecordSources['stats']): AllTimeTotalsRecord {
  return {
    totalBlobs: stats.data.totalBlobs,
    averageBaseFee: stats.data.averageBaseFee,
  };
}

/** Derive every record section from the source payloads. */
export function deriveBlobRecords(sources: BlobRecordSources): BlobRecords {
  return {
    fullBlockStreaks: deriveStreakLeaderboard(sources.records.full_block_streaks),
    aboveTargetStreaks: deriveStreakLeaderboard(
      sources.records.above_target_streaks
    ),
    belowTargetStreaks: deriveStreakLeaderboard(
      sources.records.below_target_streaks
    ),
    feePeaks: deriveFeePeaks(sources.records),
    expensiveBlocks: deriveExpensiveBlocks(sources.records),
    busiestHours: deriveBusiestHours(sources.records),
    busiestDays: deriveBusiestDays(sources.records),
    priciestDays: derivePriciestDays(sources.attribution),
    utilizationDays: deriveUtilizationDays(sources.records),
    topSpenders: deriveTopSpenders(sources.attribution),
    allTime: deriveAllTime(sources.stats),
    milestones: deriveMilestones(sources.attribution),
  };
}
