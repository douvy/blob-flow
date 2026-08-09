/**
 * Flippening detection: pairwise blob-share crossover events between the top
 * entities in an attribution-usage chart response.
 *
 * Share semantics: the tracked metric is a rolling-window share. At each
 * chart bucket, an entity's share is its blob count over the trailing
 * `windowSeconds` (the UI passes the selected time filter, e.g. 24h)
 * divided by all blobs in that same trailing window. A flip is the moment
 * that rolling share crosses another entity's, which matches the plain
 * reading of "Base flipped Arbitrum in 24h blob share". Callers fetch a
 * range longer than the window so crossings have history to show up in.
 * When no window is given, the window degenerates to a single bucket.
 *
 * Noise controls:
 * - Epsilon hysteresis: evaluation points where the pair's shares differ by
 *   less than `epsilonPoints` percentage points are treated as a tie and
 *   never change the leader, so entities jittering around parity do not
 *   spam events. A flip is only recorded once the challenger leads by at
 *   least epsilon.
 * - Adjacent reversal collapse: a flip that is flipped straight back at the
 *   next evaluation point is a transient blip, not a lead change; both
 *   events are dropped. Any surviving later flip still reads correctly,
 *   because dropping a reversal pair leaves the pair's leader where it
 *   started.
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

/** Rolling-window blob share evaluated at one chart bucket. */
export interface FlippeningBucketShares {
  /** Index of the bucket in the response's points array. */
  bucketIndex: number;
  timestamp: string;
  /** Total blobs across all entities in the trailing window. */
  totalBlobs: number;
  /** Blob share of the window total, in percent, keyed by entity key. */
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

/** Share gap between two adjacently ranked entities at the latest window. */
export interface FlippeningGap {
  leader: FlippeningEntity;
  trailer: FlippeningEntity;
  leaderSharePercent: number;
  trailerSharePercent: number;
  /** leaderSharePercent minus trailerSharePercent, in percentage points. */
  gapPoints: number;
}

/** One row of the current standings, ranked by the latest window's share. */
export interface FlippeningStanding {
  /** 1-based position in the current ranking. */
  rank: number;
  entity: FlippeningEntity;
  sharePercent: number;
  /** Points behind the rollup one place above, null for the leader. */
  gapToAbovePoints: number | null;
  /** Most recent flip this rollup won, if any. */
  lastFlipWon: FlippeningEvent | null;
  /** Most recent flip this rollup lost, if any. */
  lastFlipLost: FlippeningEvent | null;
}

export interface FlippeningAnalysis {
  /** Top entities by blob count over the latest window, highest first. */
  entities: FlippeningEntity[];
  /** Confirmed crossover events, oldest first. */
  events: FlippeningEvent[];
  /** Current ranking of every tracked entity, highest share first. */
  standings: FlippeningStanding[];
  /** Smallest current share gap between adjacently ranked entities. */
  closestGap: FlippeningGap | null;
}

export interface FlippeningOptions {
  /** How many entities (by blob count in the latest window) to track. */
  topN?: number;
  /** Share gaps below this many percentage points count as a tie. */
  epsilonPoints?: number;
  /**
   * Length of the rolling share window (normally the UI's time filter).
   * Defaults to one bucket, i.e. plain per-bucket share.
   */
  windowSeconds?: number;
}

export const DEFAULT_FLIPPENING_TOP_N = 10;
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
 * Top `topN` entities by total blob count, highest first. When
 * `lastBuckets` is given, only that many trailing buckets are counted, so
 * the ranking reflects the current window rather than the whole fetched
 * history. Entities with no blobs in scope and the aggregate other/unknown
 * buckets are excluded (see resolveTrackedEntity); ties break by key so the
 * ranking is deterministic.
 */
export function selectTopEntities(
  response: BackendAttributionUsageChartResponse,
  topN: number,
  lastBuckets?: number
): FlippeningEntity[] {
  const points =
    lastBuckets !== undefined ? response.points.slice(-lastBuckets) : response.points;

  const totals = new Map<string, number>();
  for (const point of points) {
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
 * Rolling-window blob shares evaluated at each bucket. The window spans
 * `windowSeconds` (rounded to whole buckets, minimum one); shares only
 * count entities against the window's total across all entities, so a
 * tracked entity's share matches what the attribution chart displays.
 *
 * Evaluation starts at the first bucket with a full window behind it. When
 * the history is shorter than one window, a single evaluation over all
 * available buckets is emitted so callers can still rank current shares.
 */
export function computeRollingShares(
  points: BackendAttributionUsagePoint[],
  bucketSeconds: number,
  windowSeconds: number
): FlippeningBucketShares[] {
  if (points.length === 0) return [];

  const windowBuckets = Math.max(1, Math.round(windowSeconds / Math.max(1, bucketSeconds)));
  const countsByKey = new Map<string, number>();
  let totalBlobs = 0;

  const addPoint = (point: BackendAttributionUsagePoint, sign: 1 | -1) => {
    for (const [key, value] of Object.entries(point.values)) {
      const delta = (value.blob_count ?? 0) * sign;
      countsByKey.set(key, (countsByKey.get(key) ?? 0) + delta);
      totalBlobs += delta;
    }
  };

  const result: FlippeningBucketShares[] = [];
  for (let index = 0; index < points.length; index += 1) {
    addPoint(points[index], 1);
    if (index >= windowBuckets) addPoint(points[index - windowBuckets], -1);

    const hasFullWindow = index >= windowBuckets - 1;
    const isPartialFallback = index === points.length - 1 && points.length < windowBuckets;
    if (!hasFullWindow && !isPartialFallback) continue;

    const sharePercentByKey: Record<string, number> = {};
    if (totalBlobs > 0) {
      for (const [key, count] of countsByKey) {
        if (count > 0) sharePercentByKey[key] = (count / totalBlobs) * 100;
      }
    }
    result.push({
      bucketIndex: index,
      timestamp: points[index].timestamp,
      totalBlobs,
      sharePercentByKey,
    });
  }
  return result;
}

/** Single-bucket shares: the degenerate rolling window of one bucket. */
export function computeBucketShares(
  points: BackendAttributionUsagePoint[]
): FlippeningBucketShares[] {
  return computeRollingShares(points, 1, 1);
}

/**
 * Drop pairs of consecutive events where a flip is reverted at the very
 * next evaluation point. Events must belong to a single pair and be ordered
 * by bucket.
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
 * adjacent reversal collapse. The first evaluation where either entity
 * leads by at least epsilon establishes the baseline leader without
 * emitting an event.
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
 * Current standings: every tracked entity ranked by its share at the latest
 * evaluated window, annotated with the gap to the place above and the most
 * recent flip it won or lost. Events must be ordered oldest first, as
 * detectCrossoverEvents returns them.
 */
export function computeStandings(
  buckets: FlippeningBucketShares[],
  entities: FlippeningEntity[],
  events: FlippeningEvent[]
): FlippeningStanding[] {
  const latest = buckets[buckets.length - 1];
  if (latest === undefined) return [];

  const lastWonByKey = new Map<string, FlippeningEvent>();
  const lastLostByKey = new Map<string, FlippeningEvent>();
  for (const event of events) {
    lastWonByKey.set(event.winner.key, event);
    lastLostByKey.set(event.loser.key, event);
  }

  return entities
    .map((entity) => ({ entity, share: latest.sharePercentByKey[entity.key] ?? 0 }))
    .sort((a, b) =>
      b.share !== a.share ? b.share - a.share : a.entity.key.localeCompare(b.entity.key)
    )
    .map((row, index, ranked) => ({
      rank: index + 1,
      entity: row.entity,
      sharePercent: row.share,
      gapToAbovePoints: index === 0 ? null : ranked[index - 1].share - row.share,
      lastFlipWon: lastWonByKey.get(row.entity.key) ?? null,
      lastFlipLost: lastLostByKey.get(row.entity.key) ?? null,
    }));
}

/**
 * The closest currently-unflipped pair: among the tracked entities ranked
 * by their share at the latest evaluated window, the adjacent pair with the
 * smallest lead. Uses the same rolling share as event detection, so the gap
 * is the distance to the next event the feed would report.
 */
export function findClosestGap(
  buckets: FlippeningBucketShares[],
  entities: FlippeningEntity[]
): FlippeningGap | null {
  if (entities.length < 2) return null;
  const standings = computeStandings(buckets, entities, []);

  let closest: FlippeningGap | null = null;
  for (let i = 0; i + 1 < standings.length; i += 1) {
    const leader = standings[i];
    const trailer = standings[i + 1];
    const gapPoints = leader.sharePercent - trailer.sharePercent;
    if (closest === null || gapPoints < closest.gapPoints) {
      closest = {
        leader: leader.entity,
        trailer: trailer.entity,
        leaderSharePercent: leader.sharePercent,
        trailerSharePercent: trailer.sharePercent,
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
  const bucketSeconds = Math.max(1, response.bucket_seconds || 1);
  const windowSeconds = options.windowSeconds ?? bucketSeconds;
  const windowBuckets = Math.max(1, Math.round(windowSeconds / bucketSeconds));

  const entities = selectTopEntities(response, topN, windowBuckets);
  const buckets = computeRollingShares(response.points, bucketSeconds, windowSeconds);
  const events = detectCrossoverEvents(buckets, entities, epsilonPoints);
  const standings = computeStandings(buckets, entities, events);
  const closestGap = findClosestGap(buckets, entities);

  return { entities, events, standings, closestGap };
}
