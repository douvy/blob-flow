import { describe, expect, it } from 'vitest';
import {
  analyzeFlippening,
  computeBucketShares,
  detectCrossoverEvents,
  findClosestGap,
  selectTopEntities,
} from './flippening';
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsagePoint,
  BackendAttributionUsageShare,
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

function makeShare(
  key: string,
  blobCount: number,
  blobSharePercent: number
): BackendAttributionUsageShare {
  return {
    key,
    name: key.toUpperCase(),
    category: 'l2',
    blob_count: blobCount,
    total_cost_wei: '0',
    blob_share_percent: blobSharePercent,
    spend_share_percent: blobSharePercent,
  };
}

function makeResponse(
  buckets: BucketCounts[],
  shares: BackendAttributionUsageShare[] = []
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
      name: key.toUpperCase(),
      category: 'l2',
    })),
    points: buckets.map((counts, index) => makePoint(index, counts)),
    summary: {
      total_blobs: buckets.reduce(
        (sum, counts) =>
          sum + Object.values(counts).reduce((bucketSum, count) => bucketSum + count, 0),
        0
      ),
      total_cost_wei: '0',
      shares,
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

describe('findClosestGap', () => {
  it('returns the adjacent ranked pair with the smallest lead', () => {
    const response = makeResponse(
      [{ base: 1, arbitrum: 1, optimism: 1 }],
      [
        makeShare('base', 500, 50),
        makeShare('arbitrum', 300, 30),
        makeShare('optimism', 200, 20),
      ]
    );
    const gap = findClosestGap(response, selectTopEntities(response, 6));
    expect(gap).not.toBeNull();
    expect(gap?.leader.key).toBe('arbitrum');
    expect(gap?.trailer.key).toBe('optimism');
    expect(gap?.gapPoints).toBeCloseTo(10);
  });

  it('ignores summary entries outside the tracked entities', () => {
    const response = makeResponse(
      [{ base: 10, arbitrum: 5 }],
      [
        makeShare('base', 10, 60),
        makeShare('arbitrum', 5, 30),
        makeShare('untracked', 2, 29),
      ]
    );
    const gap = findClosestGap(response, selectTopEntities(response, 2));
    expect(gap?.leader.key).toBe('base');
    expect(gap?.trailer.key).toBe('arbitrum');
    expect(gap?.gapPoints).toBeCloseTo(30);
  });

  it('returns null when fewer than two tracked entities have shares', () => {
    const response = makeResponse([{ base: 10 }], [makeShare('base', 10, 100)]);
    expect(findClosestGap(response, selectTopEntities(response, 6))).toBeNull();
  });
});

describe('analyzeFlippening', () => {
  it('combines entity selection, events, and the closest gap', () => {
    const response = makeResponse(
      [
        { base: 40, arbitrum: 60, optimism: 10 },
        { base: 70, arbitrum: 30, optimism: 10 },
      ],
      [
        makeShare('base', 110, 50),
        makeShare('arbitrum', 90, 41),
        makeShare('optimism', 20, 9),
      ]
    );
    const analysis = analyzeFlippening(response);
    expect(analysis.entities.map((entity) => entity.key)).toEqual([
      'base',
      'arbitrum',
      'optimism',
    ]);
    expect(analysis.events).toHaveLength(1);
    expect(analysis.events[0].winner.key).toBe('base');
    expect(analysis.closestGap?.leader.key).toBe('base');
    expect(analysis.closestGap?.gapPoints).toBeCloseTo(9);
  });

  it('handles an empty response', () => {
    const analysis = analyzeFlippening(makeResponse([]));
    expect(analysis.entities).toEqual([]);
    expect(analysis.events).toEqual([]);
    expect(analysis.closestGap).toBeNull();
  });
});
