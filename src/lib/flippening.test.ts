import { describe, expect, it } from 'vitest';
import {
  analyzeFlippening,
  computeBucketShares,
  computeRollingShares,
  computeStandings,
  detectCrossoverEvents,
  findClosestGap,
  selectTopEntities,
} from './flippening';
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsagePoint,
} from '../types';

type BucketCounts = Record<string, number>;

function makePoint(index: number, counts: BucketCounts): BackendAttributionUsagePoint {
  const values: BackendAttributionUsagePoint['values'] = {};
  for (const [key, blobCount] of Object.entries(counts)) {
    values[key] = {
      blob_count: blobCount,
      total_cost_wei: '0',
      blob_gas_used: blobCount * 131072,
    };
  }
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, index * 10)).toISOString(),
    values,
  };
}

type SeriesMeta = Record<string, { category?: string; address?: string; name?: string }>;

function makeResponse(
  buckets: BucketCounts[],
  seriesMeta: SeriesMeta = {}
): BackendAttributionUsageChartResponse {
  const keys = new Set<string>();
  buckets.forEach((counts) => Object.keys(counts).forEach((key) => keys.add(key)));
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '24h',
    granularity: 'hour',
    bucket_seconds: 600,
    start_time: makePoint(0, {}).timestamp,
    end_time: makePoint(buckets.length, {}).timestamp,
    generated_at: makePoint(buckets.length, {}).timestamp,
    series: Array.from(keys).map((key) => ({
      key,
      name: seriesMeta[key]?.name ?? key.toUpperCase(),
      category: seriesMeta[key]?.category ?? 'rollup',
      ...(seriesMeta[key]?.address !== undefined && { address: seriesMeta[key].address }),
    })),
    points: buckets.map((counts, index) => makePoint(index, counts)),
    summary: {
      total_blobs: buckets.reduce(
        (sum, counts) =>
          sum + Object.values(counts).reduce((bucketSum, count) => bucketSum + count, 0),
        0
      ),
      total_cost_wei: '0',
      shares: [],
    },
  };
}

describe('selectTopEntities', () => {
  it('ranks entities by total blob count and caps at topN', () => {
    const response = makeResponse([
      { base: 10, arbitrum: 6, optimism: 4, zksync: 1 },
      { base: 10, arbitrum: 8, optimism: 2, zksync: 1 },
    ]);
    const entities = selectTopEntities(response, 3);
    expect(entities.map((entity) => entity.key)).toEqual(['base', 'arbitrum', 'optimism']);
    expect(entities[0].name).toBe('BASE');
  });

  it('excludes entities with zero blobs and breaks ties by key', () => {
    const response = makeResponse([{ b: 5, a: 5, silent: 0 }]);
    expect(selectTopEntities(response, 5).map((entity) => entity.key)).toEqual(['a', 'b']);
  });

  it('excludes the aggregate other bucket', () => {
    const response = makeResponse([{ base: 5, other: 50 }], {
      other: { category: 'other', name: 'Other' },
    });
    expect(selectTopEntities(response, 5).map((entity) => entity.key)).toEqual(['base']);
  });

  it('excludes the aggregate unknown bucket when it has no address', () => {
    const response = makeResponse([{ base: 5, unknown: 50 }], {
      unknown: { category: 'unknown', name: 'Unknown' },
    });
    expect(selectTopEntities(response, 5).map((entity) => entity.key)).toEqual(['base']);
  });

  it('labels a single-address unknown sender by its address', () => {
    const response = makeResponse([{ base: 5, mystery: 50 }], {
      mystery: {
        category: 'unknown',
        name: 'Unknown',
        address: '0xDaa526086787d9DEbE1D7F3FFdb1fE50cf8687F4',
      },
    });
    const entities = selectTopEntities(response, 5);
    expect(entities.map((entity) => entity.key)).toEqual(['mystery', 'base']);
    expect(entities[0].name).toBe('0xDaa5...87F4');
  });

  it('does not let excluded aggregates consume topN slots', () => {
    const response = makeResponse([{ other: 100, unknown: 90, base: 5, arbitrum: 4 }], {
      other: { category: 'other', name: 'Other' },
      unknown: { category: 'unknown', name: 'Unknown' },
    });
    expect(selectTopEntities(response, 2).map((entity) => entity.key)).toEqual([
      'base',
      'arbitrum',
    ]);
  });

  it('ranks by the trailing window only when lastBuckets is given', () => {
    const response = makeResponse([
      { base: 100, arbitrum: 1 },
      { base: 1, arbitrum: 5 },
    ]);
    expect(selectTopEntities(response, 2, 1).map((entity) => entity.key)).toEqual([
      'arbitrum',
      'base',
    ]);
  });
});

describe('computeBucketShares', () => {
  it('computes each share against the bucket total across all entities', () => {
    const [bucket] = computeBucketShares([makePoint(0, { base: 6, arbitrum: 3, other: 1 })]);
    expect(bucket.totalBlobs).toBe(10);
    expect(bucket.sharePercentByKey.base).toBeCloseTo(60);
    expect(bucket.sharePercentByKey.arbitrum).toBeCloseTo(30);
    expect(bucket.sharePercentByKey.other).toBeCloseTo(10);
  });

  it('leaves zero-blob buckets without shares', () => {
    const [bucket] = computeBucketShares([makePoint(0, {})]);
    expect(bucket.totalBlobs).toBe(0);
    expect(bucket.sharePercentByKey).toEqual({});
  });
});

describe('detectCrossoverEvents', () => {
  const base = { key: 'base', name: 'Base' };
  const arbitrum = { key: 'arbitrum', name: 'Arbitrum' };

  function events(buckets: BucketCounts[], epsilon = 0.5) {
    return detectCrossoverEvents(
      computeBucketShares(buckets.map((counts, index) => makePoint(index, counts))),
      [base, arbitrum],
      epsilon
    );
  }

  it('emits a single event when one entity passes another', () => {
    const result = events([
      { base: 4, arbitrum: 6 },
      { base: 7, arbitrum: 3 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].winner.key).toBe('base');
    expect(result[0].loser.key).toBe('arbitrum');
    expect(result[0].bucketIndex).toBe(1);
    expect(result[0].winnerSharePercent).toBeCloseTo(70);
    expect(result[0].loserSharePercent).toBeCloseTo(30);
  });

  it('does not emit an event on the first bucket that establishes a leader', () => {
    expect(events([{ base: 7, arbitrum: 3 }])).toHaveLength(0);
  });

  it('ignores crossovers that stay within epsilon of a tie', () => {
    // 50.2% vs 49.8% is a 0.4 point lead, inside the 0.5 point epsilon.
    const result = events([
      { base: 400, arbitrum: 600 },
      { base: 502, arbitrum: 498 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('keeps the established leader through an epsilon-tied dip', () => {
    const result = events([
      { base: 700, arbitrum: 300 },
      { base: 501, arbitrum: 499 },
      { base: 650, arbitrum: 350 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('confirms a flip only once the challenger clears epsilon', () => {
    const result = events([
      { base: 700, arbitrum: 300 },
      { base: 499, arbitrum: 501 },
      { base: 300, arbitrum: 700 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].winner.key).toBe('arbitrum');
    expect(result[0].bucketIndex).toBe(2);
  });

  it('collapses a flip reverted in the immediately following bucket', () => {
    const result = events([
      { base: 7, arbitrum: 3 },
      { base: 3, arbitrum: 7 },
      { base: 7, arbitrum: 3 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('keeps both events when the reversal is not in the adjacent bucket', () => {
    const result = events([
      { base: 7, arbitrum: 3 },
      { base: 3, arbitrum: 7 },
      { base: 4, arbitrum: 6 },
      { base: 7, arbitrum: 3 },
    ]);
    expect(result.map((event) => [event.winner.key, event.bucketIndex])).toEqual([
      ['arbitrum', 1],
      ['base', 3],
    ]);
  });

  it('keeps a surviving flip after collapsing a transient one', () => {
    // Flip at 1 reverted at 2 (dropped), then a real flip at 3.
    const result = events([
      { base: 7, arbitrum: 3 },
      { base: 3, arbitrum: 7 },
      { base: 7, arbitrum: 3 },
      { base: 2, arbitrum: 8 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].winner.key).toBe('arbitrum');
    expect(result[0].bucketIndex).toBe(3);
  });

  it('treats an entity missing from a bucket as zero blobs', () => {
    const result = events([
      { arbitrum: 10 },
      { base: 8, arbitrum: 2 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].winner.key).toBe('base');
  });

  it('skips zero-blob buckets without disturbing the leader state', () => {
    const result = events([
      { base: 7, arbitrum: 3 },
      {},
      { base: 6, arbitrum: 4 },
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns no events for empty input', () => {
    expect(events([])).toHaveLength(0);
  });
});

describe('computeRollingShares', () => {
  it('sums blob counts over the trailing window', () => {
    const points = [
      makePoint(0, { base: 10, arbitrum: 0 }),
      makePoint(1, { base: 0, arbitrum: 10 }),
      makePoint(2, { base: 0, arbitrum: 10 }),
    ];
    // 600s buckets, 1200s window: two buckets per evaluation.
    const shares = computeRollingShares(points, 600, 1200);
    expect(shares.map((entry) => entry.bucketIndex)).toEqual([1, 2]);
    expect(shares[0].totalBlobs).toBe(20);
    expect(shares[0].sharePercentByKey.base).toBeCloseTo(50);
    expect(shares[0].sharePercentByKey.arbitrum).toBeCloseTo(50);
    expect(shares[1].totalBlobs).toBe(20);
    expect(shares[1].sharePercentByKey.base).toBeUndefined();
    expect(shares[1].sharePercentByKey.arbitrum).toBeCloseTo(100);
  });

  it('degenerates to per-bucket shares when the window is one bucket', () => {
    const points = [makePoint(0, { base: 6, arbitrum: 4 })];
    const [bucket] = computeRollingShares(points, 600, 600);
    expect(bucket.totalBlobs).toBe(10);
    expect(bucket.sharePercentByKey.base).toBeCloseTo(60);
  });

  it('emits one partial evaluation when history is shorter than the window', () => {
    const points = [
      makePoint(0, { base: 6, arbitrum: 4 }),
      makePoint(1, { base: 4, arbitrum: 6 }),
    ];
    const shares = computeRollingShares(points, 600, 6000);
    expect(shares).toHaveLength(1);
    expect(shares[0].bucketIndex).toBe(1);
    expect(shares[0].totalBlobs).toBe(20);
    expect(shares[0].sharePercentByKey.base).toBeCloseTo(50);
  });

  it('returns nothing for empty input', () => {
    expect(computeRollingShares([], 600, 1200)).toEqual([]);
  });
});

describe('computeStandings', () => {
  const entities = [
    { key: 'base', name: 'Base' },
    { key: 'arbitrum', name: 'Arbitrum' },
    { key: 'optimism', name: 'Optimism' },
  ];

  it('ranks every tracked entity by its latest share with the gap above', () => {
    const buckets = computeBucketShares([makePoint(0, { base: 50, arbitrum: 30, optimism: 20 })]);
    const standings = computeStandings(buckets, entities, []);
    expect(standings.map((row) => [row.rank, row.entity.key])).toEqual([
      [1, 'base'],
      [2, 'arbitrum'],
      [3, 'optimism'],
    ]);
    expect(standings[0].gapToAbovePoints).toBeNull();
    expect(standings[1].gapToAbovePoints).toBeCloseTo(20);
    expect(standings[2].gapToAbovePoints).toBeCloseTo(10);
  });

  it('attaches the most recent flip each entity won and lost', () => {
    const buckets = computeBucketShares([
      makePoint(0, { base: 20, arbitrum: 50, optimism: 30 }),
      makePoint(1, { base: 50, arbitrum: 30, optimism: 20 }),
    ]);
    const events = detectCrossoverEvents(buckets, entities, 0.5);
    const standings = computeStandings(buckets, entities, events);
    const base = standings.find((row) => row.entity.key === 'base');
    const arbitrum = standings.find((row) => row.entity.key === 'arbitrum');
    expect(base?.lastFlipWon?.loser.key).toBe('optimism');
    expect(base?.lastFlipLost).toBeNull();
    expect(arbitrum?.lastFlipLost?.winner.key).toBe('base');
  });

  it('gives entities absent from the latest window a zero share', () => {
    const buckets = computeBucketShares([makePoint(0, { base: 10 })]);
    const standings = computeStandings(buckets, entities, []);
    expect(standings[0].entity.key).toBe('base');
    expect(standings[1].sharePercent).toBe(0);
    expect(standings[2].sharePercent).toBe(0);
  });

  it('returns nothing when there are no evaluated windows', () => {
    expect(computeStandings([], entities, [])).toEqual([]);
  });
});

describe('findClosestGap', () => {
  const entities = [
    { key: 'base', name: 'Base' },
    { key: 'arbitrum', name: 'Arbitrum' },
    { key: 'optimism', name: 'Optimism' },
  ];

  it('returns the adjacent ranked pair with the smallest lead at the latest window', () => {
    const buckets = computeBucketShares([
      makePoint(0, { base: 90, arbitrum: 5, optimism: 5 }),
      makePoint(1, { base: 50, arbitrum: 30, optimism: 20 }),
    ]);
    const gap = findClosestGap(buckets, entities);
    expect(gap).not.toBeNull();
    expect(gap?.leader.key).toBe('arbitrum');
    expect(gap?.trailer.key).toBe('optimism');
    expect(gap?.gapPoints).toBeCloseTo(10);
  });

  it('ignores share keys outside the tracked entities', () => {
    const buckets = computeBucketShares([
      makePoint(0, { base: 60, arbitrum: 30, untracked: 10 }),
    ]);
    const gap = findClosestGap(buckets, entities.slice(0, 2));
    expect(gap?.leader.key).toBe('base');
    expect(gap?.trailer.key).toBe('arbitrum');
    expect(gap?.gapPoints).toBeCloseTo(30);
  });

  it('returns null with fewer than two tracked entities or no windows', () => {
    const buckets = computeBucketShares([makePoint(0, { base: 10 })]);
    expect(findClosestGap(buckets, entities.slice(0, 1))).toBeNull();
    expect(findClosestGap([], entities)).toBeNull();
  });
});

describe('analyzeFlippening', () => {
  it('combines entity selection, events, and the closest gap', () => {
    const response = makeResponse([
      { base: 40, arbitrum: 60, optimism: 10 },
      { base: 70, arbitrum: 30, optimism: 10 },
    ]);
    const analysis = analyzeFlippening(response);
    expect(analysis.entities.map((entity) => entity.key)).toEqual([
      'base',
      'arbitrum',
      'optimism',
    ]);
    expect(analysis.events).toHaveLength(1);
    expect(analysis.events[0].winner.key).toBe('base');
    // Latest bucket: base 63.6%, arbitrum 27.3%, optimism 9.1%.
    expect(analysis.closestGap?.leader.key).toBe('arbitrum');
    expect(analysis.closestGap?.trailer.key).toBe('optimism');
    expect(analysis.closestGap?.gapPoints).toBeCloseTo(18.18, 1);
  });

  it('detects crossovers of the rolling window share, not the bucket share', () => {
    // Bucket shares flip back and forth every bucket, but the 2-bucket
    // rolling share only crosses once, at the last evaluation.
    const response = makeResponse([
      { base: 10, arbitrum: 0 },
      { base: 0, arbitrum: 6 },
      { base: 10, arbitrum: 0 },
      { base: 0, arbitrum: 30 },
    ]);
    const analysis = analyzeFlippening(response, { windowSeconds: 1200 });
    expect(analysis.events).toHaveLength(1);
    expect(analysis.events[0].winner.key).toBe('arbitrum');
    expect(analysis.events[0].bucketIndex).toBe(3);
  });

  it('ranks tracked entities by the current window, not the whole history', () => {
    const response = makeResponse([
      { base: 100, arbitrum: 1 },
      { base: 1, arbitrum: 5 },
    ]);
    const analysis = analyzeFlippening(response, { windowSeconds: 600, topN: 1 });
    expect(analysis.entities.map((entity) => entity.key)).toEqual(['arbitrum']);
  });

  it('includes standings covering every tracked rollup', () => {
    const response = makeResponse([{ base: 50, arbitrum: 30, optimism: 20 }]);
    const analysis = analyzeFlippening(response);
    expect(analysis.standings.map((row) => row.entity.key)).toEqual([
      'base',
      'arbitrum',
      'optimism',
    ]);
    expect(analysis.standings[0].sharePercent).toBeCloseTo(50);
  });

  it('handles an empty response', () => {
    const analysis = analyzeFlippening(makeResponse([]));
    expect(analysis.entities).toEqual([]);
    expect(analysis.events).toEqual([]);
    expect(analysis.standings).toEqual([]);
    expect(analysis.closestGap).toBeNull();
  });
});
