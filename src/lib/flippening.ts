/**
 * Flippening detection: pairwise blob-share crossover events between the top
 * entities in an attribution-usage chart response.
 *
 * Share semantics: detection uses per-bucket share (an entity's blob_count
 * divided by the bucket's total blob_count across all entities), not
 * cumulative share over the range. Bucket share reflects the moment one
 * rollup actually overtakes another; cumulative share drags the whole
 * history along, so a crossover would register buckets or days after the
 * lead actually changed hands. The summary's range-wide shares are still
 * used for the "closest gap" indicator, which is a statement about the
 * whole window rather than a single bucket.
 *
 * Noise controls:
 * - Epsilon hysteresis: buckets where the pair's shares differ by less than
 *   `epsilonPoints` percentage points are treated as a tie and never change
 *   the leader, so entities jittering around parity do not spam events. A
 *   flip is only recorded once the challenger leads by at least epsilon.
 * - Adjacent reversal collapse: a flip that is flipped straight back in the
 *   next bucket is a transient blip, not a lead change; both events are
 *   dropped. Any surviving later flip still reads correctly, because
 *   dropping a reversal pair leaves the pair's leader where it started.
 */

import { truncateAddress } from '../utils';
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsagePoint,
} from '../types';

export interface FlippeningEntity {
  key: string;
  name: string;
}

/** Per-bucket blob share for every entity present in the bucket. */
export interface FlippeningBucketShares {
  /** Index of the bucket in the response's points array. */
  bucketIndex: number;
  timestamp: string;
  totalBlobs: number;
  /** Blob share of the bucket total, in percent, keyed by entity key. */
  sharePercentByKey: Record<string, number>;
}

export interface FlippeningEvent {
  /** Index of the bucket where the new leader was confirmed. */
  bucketIndex: number;
  timestamp: string;
  /** Entity that took the lead. */
  winner: FlippeningEntity;
  /** Entity that lost the lead. */
  loser: FlippeningEntity;
  winnerSharePercent: number;
  loserSharePercent: number;
}

/** Range-wide share gap between two adjacently ranked entities. */
export interface FlippeningGap {
  leader: FlippeningEntity;
  trailer: FlippeningEntity;
  leaderSharePercent: number;
  trailerSharePercent: number;
  /** leaderSharePercent minus trailerSharePercent, in percentage points. */
  gapPoints: number;
}

export interface FlippeningAnalysis {
  /** Top entities by total blob count over the window, highest first. */
  entities: FlippeningEntity[];
  /** Confirmed crossover events, oldest first. */
  events: FlippeningEvent[];
  /** Smallest range-wide share gap between adjacently ranked entities. */
  closestGap: FlippeningGap | null;
}

export interface FlippeningOptions {
  /** How many entities (by total blob count) to track. */
  topN?: number;
  /** Share gaps below this many percentage points count as a tie. */
  epsilonPoints?: number;
}

export const DEFAULT_FLIPPENING_TOP_N = 6;
export const DEFAULT_FLIPPENING_EPSILON_POINTS = 0.5;

interface EntityMeta {
  name: string;
  category?: string;
  address?: string;
}

/**
 * Display identity for a tracked entity, or null when the series is an
 * aggregate rather than a single rollup. The backend's "other" bucket lumps
 * the long tail together and the "unknown" bucket pools unattributed
 * senders; a flip against a pool is not a flip against anyone, so both are
 * excluded. An unknown-category series that does carry an address is a
 * single unattributed sender: it stays tracked, labeled by its address.
 */
function resolveTrackedEntity(key: string, meta: EntityMeta | undefined): FlippeningEntity | null {
  if (meta === undefined) return { key, name: key };
  if (meta.category === 'other') return null;
  if (meta.category === 'unknown') {
    return meta.address ? { key, name: truncateAddress(meta.address) } : null;
  }
  return { key, name: meta.name };
}

/**
 * Top `topN` entities by total blob count across all buckets, highest first.
 * Entities with zero blobs in the window and the aggregate other/unknown
 * buckets are excluded (see resolveTrackedEntity); ties break by key so the
 * ranking is deterministic.
 */
export function selectTopEntities(
  response: BackendAttributionUsageChartResponse,
  topN: number
): FlippeningEntity[] {
  const totals = new Map<string, number>();
  for (const point of response.points) {
    for (const [key, value] of Object.entries(point.values)) {
      totals.set(key, (totals.get(key) ?? 0) + (value.blob_count ?? 0));
    }
  }

  const metaByKey = new Map<string, EntityMeta>();
  for (const series of response.series) {
    metaByKey.set(series.key, {
      name: series.name,
      category: series.category,
      address: series.address,
    });
  }
  for (const share of response.summary?.shares ?? []) {
    if (!metaByKey.has(share.key)) {
      metaByKey.set(share.key, { name: share.name, category: share.category });
    }
  }

  return Array.from(totals.entries())
    .filter(([, total]) => total > 0)
    .sort(([keyA, totalA], [keyB, totalB]) =>
      totalB !== totalA ? totalB - totalA : keyA.localeCompare(keyB)
    )
    .map(([key]) => resolveTrackedEntity(key, metaByKey.get(key)))
    .filter((entity): entity is FlippeningEntity => entity !== null)
    .slice(0, topN);
}

/**
 * Per-bucket blob shares. Shares are computed against the bucket's total
 * across all entities in the response (not just the tracked top N), so a
 * tracked entity's share matches what the attribution chart displays.
 * Buckets with zero blobs carry no shares and are skipped by detection.
 */
export function computeBucketShares(
  points: BackendAttributionUsagePoint[]
): FlippeningBucketShares[] {
  return points.map((point, bucketIndex) => {
    let totalBlobs = 0;
    for (const value of Object.values(point.values)) {
      totalBlobs += value.blob_count ?? 0;
    }

    const sharePercentByKey: Record<string, number> = {};
    if (totalBlobs > 0) {
      for (const [key, value] of Object.entries(point.values)) {
        sharePercentByKey[key] = ((value.blob_count ?? 0) / totalBlobs) * 100;
      }
    }

    return { bucketIndex, timestamp: point.timestamp, totalBlobs, sharePercentByKey };
  });
}

/**
 * Drop pairs of consecutive events where a flip is reverted in the very next
 * bucket. Events must belong to a single pair and be ordered by bucket.
 */
function collapseAdjacentReversals(events: FlippeningEvent[]): FlippeningEvent[] {
  const kept: FlippeningEvent[] = [];
  let index = 0;
  while (index < events.length) {
    const current = events[index];
    const next = events[index + 1];
    if (
      next !== undefined &&
      next.bucketIndex === current.bucketIndex + 1 &&
      next.winner.key === current.loser.key
    ) {
      index += 2;
      continue;
    }
    kept.push(current);
    index += 1;
  }
  return kept;
}

/**
 * Crossover events for one entity pair, applying epsilon hysteresis and the
 * adjacent reversal collapse. The first bucket where either entity leads by
 * at least epsilon establishes the baseline leader without emitting an event.
 */
function detectPairEvents(
  buckets: FlippeningBucketShares[],
  entityA: FlippeningEntity,
  entityB: FlippeningEntity,
  epsilonPoints: number
): FlippeningEvent[] {
  const events: FlippeningEvent[] = [];
  let leaderKey: string | null = null;

  for (const bucket of buckets) {
    if (bucket.totalBlobs === 0) continue;

    const shareA = bucket.sharePercentByKey[entityA.key] ?? 0;
    const shareB = bucket.sharePercentByKey[entityB.key] ?? 0;
    const diff = shareA - shareB;
    if (Math.abs(diff) < epsilonPoints) continue;

    const current = diff > 0 ? entityA : entityB;
    if (leaderKey === null) {
      leaderKey = current.key;
      continue;
    }
    if (current.key === leaderKey) continue;

    const winnerShare = current === entityA ? shareA : shareB;
    const loserShare = current === entityA ? shareB : shareA;
    events.push({
      bucketIndex: bucket.bucketIndex,
      timestamp: bucket.timestamp,
      winner: current,
      loser: current === entityA ? entityB : entityA,
      winnerSharePercent: winnerShare,
      loserSharePercent: loserShare,
    });
    leaderKey = current.key;
  }

  return collapseAdjacentReversals(events);
}

/**
 * All crossover events between the given entities, oldest first. Ties at the
 * same bucket order by winner name so the result is deterministic.
 */
export function detectCrossoverEvents(
  buckets: FlippeningBucketShares[],
  entities: FlippeningEntity[],
  epsilonPoints: number
): FlippeningEvent[] {
  const events: FlippeningEvent[] = [];
  for (let i = 0; i < entities.length; i += 1) {
    for (let j = i + 1; j < entities.length; j += 1) {
      events.push(...detectPairEvents(buckets, entities[i], entities[j], epsilonPoints));
    }
  }
  return events.sort((a, b) =>
    a.bucketIndex !== b.bucketIndex
      ? a.bucketIndex - b.bucketIndex
      : a.winner.name.localeCompare(b.winner.name)
  );
}

/**
 * The closest currently-unflipped pair: among the tracked entities ranked by
 * range-wide blob share, the adjacent pair with the smallest lead. This uses
 * the summary's blob_share_percent (the whole window's share) rather than
 * the latest bucket, so the number matches the headline attribution chart.
 */
export function findClosestGap(
  response: BackendAttributionUsageChartResponse,
  entities: FlippeningEntity[]
): FlippeningGap | null {
  const entityByKey = new Map(entities.map((entity) => [entity.key, entity]));
  const ranked = (response.summary?.shares ?? [])
    .filter((share) => entityByKey.has(share.key))
    .sort((a, b) =>
      b.blob_share_percent !== a.blob_share_percent
        ? b.blob_share_percent - a.blob_share_percent
        : a.key.localeCompare(b.key)
    );

  let closest: FlippeningGap | null = null;
  for (let i = 0; i + 1 < ranked.length; i += 1) {
    const leader = ranked[i];
    const trailer = ranked[i + 1];
    const gapPoints = leader.blob_share_percent - trailer.blob_share_percent;
    if (closest === null || gapPoints < closest.gapPoints) {
      closest = {
        // Names come from the tracked entities, not the summary, so
        // address-labeled unknown senders keep their address label here.
        leader: entityByKey.get(leader.key) ?? { key: leader.key, name: leader.name },
        trailer: entityByKey.get(trailer.key) ?? { key: trailer.key, name: trailer.name },
        leaderSharePercent: leader.blob_share_percent,
        trailerSharePercent: trailer.blob_share_percent,
        gapPoints,
      };
    }
  }
  return closest;
}

/** Full flippening analysis for an attribution-usage chart response. */
export function analyzeFlippening(
  response: BackendAttributionUsageChartResponse,
  options: FlippeningOptions = {}
): FlippeningAnalysis {
  const topN = options.topN ?? DEFAULT_FLIPPENING_TOP_N;
  const epsilonPoints = options.epsilonPoints ?? DEFAULT_FLIPPENING_EPSILON_POINTS;

  const entities = selectTopEntities(response, topN);
  const buckets = computeBucketShares(response.points);
  const events = detectCrossoverEvents(buckets, entities, epsilonPoints);
  const closestGap = findClosestGap(response, entities);

  return { entities, events, closestGap };
}
