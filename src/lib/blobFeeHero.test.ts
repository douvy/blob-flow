import { describe, expect, it } from 'vitest';
import {
  compareToWindows,
  computeFeeRangeTrend,
  computeFeeTrend,
  countBlocksAboveTarget,
  countChartPointsAboveTarget,
  getBucketHint,
  getBucketStripHint,
  getWindowAboveTargetSummary,
  formatFeeNumber,
  formatSignedPercent,
  groupChartPointsForStrip,
  mergeRecentPricingBlocks,
  parseGwei,
  trimBlocksToWindow,
} from './blobFeeHero';
import type {
  BackendBlobMarketChartPoint,
  BlobPricingRecentBlock,
  RollingWindowDataPoint,
} from '@/types';

function makeBlock(
  blockNumber: number,
  overrides: Partial<BlobPricingRecentBlock> = {}
): BlobPricingRecentBlock {
  return {
    blockNumber,
    blockTimestamp: '2026-06-11T00:00:00Z',
    blobCount: 4,
    blobGasUsed: 524288,
    blobGasTarget: 1835008,
    blobGasLimit: 2752512,
    excessBlobGas: 0,
    blobBaseFee: '0.01 Gwei',
    blobBaseFeeGwei: '0.01',
    utilizationRatio: 0.19,
    targetBlobs: 14,
    maxBlobs: 21,
    availableBlobs: 17,
    utilizationPercent: 19,
    isFull: false,
    isAboveTarget: false,
    ...overrides,
  };
}

function makeWindow(
  window: string,
  averageBaseFeeGwei: number,
  overrides: Partial<RollingWindowDataPoint> = {}
): RollingWindowDataPoint {
  return {
    window,
    label: window,
    durationSeconds: 3600,
    startTimestamp: 0,
    endTimestamp: 3600,
    averageBaseFeeGwei,
    medianBaseFeeGwei: averageBaseFeeGwei,
    p95BaseFeeGwei: averageBaseFeeGwei,
    totalBlobs: 100,
    totalBlobGasUsed: 1000,
    averageUtilizationPct: 50,
    totalCostEth: 1,
    uniqueSenders: 5,
    ...overrides,
  };
}

function makeChartPoint(
  overrides: Partial<BackendBlobMarketChartPoint> = {}
): BackendBlobMarketChartPoint {
  return {
    timestamp: '2026-06-11T00:00:00Z',
    average_blob_base_fee_gwei: '0.01',
    median_blob_base_fee_gwei: '0.01',
    p95_blob_base_fee_gwei: '0.01',
    blob_count: 4,
    blob_gas_used: 524288,
    blob_gas_target: 1835008,
    average_utilization: '0.19',
    total_cost_wei: '0',
    unique_senders: 1,
    ...overrides,
  };
}

describe('countBlocksAboveTarget', () => {
  it('counts blocks flagged above target', () => {
    const blocks = [
      makeBlock(3, { isAboveTarget: true }),
      makeBlock(2),
      makeBlock(1, { isAboveTarget: true }),
    ];

    expect(countBlocksAboveTarget(blocks)).toEqual({ aboveCount: 2, totalCount: 3 });
    expect(countBlocksAboveTarget([])).toEqual({ aboveCount: 0, totalCount: 0 });
  });
});

describe('getWindowAboveTargetSummary', () => {
  it('returns block counts for the matching window', () => {
    const windows = [
      makeWindow('1h', 0.01, { totalBlocks: 300, blocksAboveTarget: 120 }),
      makeWindow('24h', 0.01, { totalBlocks: 7200, blocksAboveTarget: 4812 }),
    ];

    expect(getWindowAboveTargetSummary(windows, '24h')).toEqual({
      aboveCount: 4812,
      totalCount: 7200,
    });
  });

  it('returns null when the window is missing or lacks block counts', () => {
    const windows = [
      makeWindow('24h', 0.01),
      makeWindow('7d', 0.01, { totalBlocks: 0, blocksAboveTarget: 0 }),
      makeWindow('30d', 0.01, { totalBlocks: 1000 }),
    ];

    // Backend predates the block-count fields.
    expect(getWindowAboveTargetSummary(windows, '24h')).toBeNull();
    // No blocks indexed in the window.
    expect(getWindowAboveTargetSummary(windows, '7d')).toBeNull();
    // Only one of the two fields present.
    expect(getWindowAboveTargetSummary(windows, '30d')).toBeNull();
    // Window not requested/returned.
    expect(getWindowAboveTargetSummary(windows, '1h')).toBeNull();
  });
});

describe('countChartPointsAboveTarget', () => {
  it('counts buckets whose gas usage exceeds the bucket target', () => {
    const points = [
      makeChartPoint({ blob_gas_used: 2_000_000, blob_gas_target: 1_835_008 }),
      makeChartPoint({ blob_gas_used: 524_288, blob_gas_target: 1_835_008 }),
      makeChartPoint({ blob_gas_used: 1_835_008, blob_gas_target: 1_835_008 }),
    ];

    expect(countChartPointsAboveTarget(points)).toEqual({ aboveCount: 1, totalCount: 3 });
  });

  it('never marks a bucket without a target as above it', () => {
    const points = [makeChartPoint({ blob_gas_used: 100, blob_gas_target: 0 })];

    expect(countChartPointsAboveTarget(points)).toEqual({ aboveCount: 0, totalCount: 1 });
  });
});

describe('groupChartPointsForStrip', () => {
  it('passes points through untouched when they fit the strip', () => {
    const points = [
      makeChartPoint({ timestamp: '2026-06-11T00:00:00Z' }),
      makeChartPoint({ timestamp: '2026-06-11T01:00:00Z' }),
    ];

    const grouped = groupChartPointsForStrip(points, 24);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toEqual({
      ...points[0],
      end_timestamp: '2026-06-11T00:00:00Z',
      bucket_count: 1,
    });
  });

  it('merges consecutive buckets down to the requested bar count', () => {
    const points = Array.from({ length: 6 }, (_, index) =>
      makeChartPoint({
        timestamp: `2026-06-11T0${index}:00:00Z`,
        start_block: index * 10,
        end_block: index * 10 + 9,
        blob_count: 2,
        blob_gas_used: 100,
        blob_gas_target: 150,
        blob_gas_limit: 200,
        average_utilization: '0.5',
        total_cost_wei: '10',
      })
    );

    const grouped = groupChartPointsForStrip(points, 2);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({
      timestamp: '2026-06-11T00:00:00Z',
      end_timestamp: '2026-06-11T02:00:00Z',
      bucket_count: 3,
      start_block: 0,
      end_block: 29,
      blob_count: 6,
      blob_gas_used: 300,
      blob_gas_target: 450,
      blob_gas_limit: 600,
      average_utilization: '0.5',
      total_cost_wei: '30',
    });
    expect(grouped[1]).toMatchObject({
      timestamp: '2026-06-11T03:00:00Z',
      end_timestamp: '2026-06-11T05:00:00Z',
      start_block: 30,
      end_block: 59,
    });
  });

  it('keeps group sizes balanced when the count does not divide evenly', () => {
    const points = Array.from({ length: 25 }, (_, index) =>
      makeChartPoint({ timestamp: `2026-06-11T00:${String(index).padStart(2, '0')}:00Z` })
    );

    const grouped = groupChartPointsForStrip(points, 24);

    expect(grouped).toHaveLength(24);
    expect(grouped.map((group) => group.bucket_count)).toEqual([2, ...Array(23).fill(1)]);
  });

  it('spreads the remainder across the oldest bars', () => {
    const points = Array.from({ length: 8 }, (_, index) =>
      makeChartPoint({ timestamp: `2026-06-11T0${index}:00:00Z` })
    );

    const grouped = groupChartPointsForStrip(points, 3);

    expect(grouped.map((group) => group.bucket_count)).toEqual([3, 3, 2]);
  });

  it('drops the merged gas limit when any bucket lacks one', () => {
    const points = [
      makeChartPoint({ blob_gas_limit: 200 }),
      makeChartPoint({ blob_gas_limit: undefined }),
    ];

    const [group] = groupChartPointsForStrip(points, 1);

    expect(group.blob_gas_limit).toBeUndefined();
  });

  it('returns nothing for empty input', () => {
    expect(groupChartPointsForStrip([], 24)).toEqual([]);
  });
});

describe('mergeRecentPricingBlocks', () => {
  it('merges fetched and live blocks newest-first without duplicates', () => {
    const fetched = [makeBlock(102), makeBlock(101), makeBlock(100)];
    const live = [makeBlock(103), makeBlock(102, { blobCount: 9 })];

    const merged = mergeRecentPricingBlocks(fetched, live);

    expect(merged.map((block) => block.blockNumber)).toEqual([103, 102, 101, 100]);
    // Fetched record wins on conflict.
    expect(merged[1].blobCount).toBe(4);
  });

  it('caps the merged list', () => {
    const fetched = [makeBlock(5), makeBlock(4), makeBlock(3)];
    const live = [makeBlock(7), makeBlock(6)];

    const merged = mergeRecentPricingBlocks(fetched, live, 3);

    expect(merged.map((block) => block.blockNumber)).toEqual([7, 6, 5]);
  });

  it('handles empty inputs', () => {
    expect(mergeRecentPricingBlocks([], [])).toEqual([]);
    expect(mergeRecentPricingBlocks([], [makeBlock(1)])).toHaveLength(1);
  });
});

describe('trimBlocksToWindow', () => {
  const newest = '2026-06-11T01:00:00Z';

  it('drops blocks older than the window behind the newest block', () => {
    const blocks = [
      makeBlock(300, { blockTimestamp: newest }),
      makeBlock(299, { blockTimestamp: '2026-06-11T00:30:00Z' }),
      // Exactly at the cutoff stays in.
      makeBlock(298, { blockTimestamp: '2026-06-11T00:00:00Z' }),
      makeBlock(297, { blockTimestamp: '2026-06-10T23:59:59Z' }),
    ];

    const trimmed = trimBlocksToWindow(blocks, 3600);

    expect(trimmed.map((block) => block.blockNumber)).toEqual([300, 299, 298]);
  });

  it('anchors the window to the newest block, not wall-clock now', () => {
    const blocks = [
      makeBlock(2, { blockTimestamp: '2020-01-01T01:00:00Z' }),
      makeBlock(1, { blockTimestamp: '2020-01-01T00:00:00Z' }),
    ];

    expect(trimBlocksToWindow(blocks, 3600)).toHaveLength(2);
  });

  it('keeps blocks with unparseable timestamps', () => {
    const blocks = [
      makeBlock(3, { blockTimestamp: newest }),
      makeBlock(2, { blockTimestamp: 'not-a-date' }),
      makeBlock(1, { blockTimestamp: '2026-06-10T23:00:00Z' }),
    ];

    expect(trimBlocksToWindow(blocks, 3600).map((block) => block.blockNumber)).toEqual([3, 2]);
  });

  it('anchors to the newest parseable timestamp when the head row is malformed or stale', () => {
    const malformedHead = [
      makeBlock(301, { blockTimestamp: 'not-a-date' }),
      makeBlock(300, { blockTimestamp: newest }),
      makeBlock(299, { blockTimestamp: '2026-06-10T23:59:59Z' }),
    ];
    expect(trimBlocksToWindow(malformedHead, 3600).map((block) => block.blockNumber)).toEqual([
      301, 300,
    ]);

    // The stale head row itself falls outside the window measured from the
    // true newest timestamp, as does the older tail block.
    const staleHead = [
      makeBlock(301, { blockTimestamp: '2026-06-10T23:59:59Z' }),
      makeBlock(300, { blockTimestamp: newest }),
      makeBlock(299, { blockTimestamp: '2026-06-10T23:00:00Z' }),
    ];
    expect(trimBlocksToWindow(staleHead, 3600).map((block) => block.blockNumber)).toEqual([300]);
  });

  it('returns the input unchanged when the list is empty or no timestamp parses', () => {
    expect(trimBlocksToWindow([], 3600)).toEqual([]);

    const blocks = [
      makeBlock(2, { blockTimestamp: 'not-a-date' }),
      makeBlock(1, { blockTimestamp: 'also-not-a-date' }),
    ];
    expect(trimBlocksToWindow(blocks, 3600)).toHaveLength(2);
  });
});

describe('computeFeeTrend', () => {
  it('computes percent change vs the lookback block', () => {
    const blocks = [
      makeBlock(110, { blobBaseFeeGwei: '0.02' }),
      makeBlock(109, { blobBaseFeeGwei: '0.015' }),
      makeBlock(108, { blobBaseFeeGwei: '0.01' }),
    ];

    const trend = computeFeeTrend(blocks, 2);

    expect(trend).not.toBeNull();
    expect(trend?.comparedBlocks).toBe(2);
    expect(trend?.deltaPercent).toBeCloseTo(100);
  });

  it('clamps the lookback to available blocks', () => {
    const blocks = [
      makeBlock(2, { blobBaseFeeGwei: '0.01' }),
      makeBlock(1, { blobBaseFeeGwei: '0.02' }),
    ];

    const trend = computeFeeTrend(blocks, 10);

    expect(trend?.comparedBlocks).toBe(1);
    expect(trend?.deltaPercent).toBeCloseTo(-50);
  });

  it('returns null without enough data or with a zero baseline', () => {
    expect(computeFeeTrend([makeBlock(1)])).toBeNull();
    expect(
      computeFeeTrend([
        makeBlock(2, { blobBaseFeeGwei: '0.01' }),
        makeBlock(1, { blobBaseFeeGwei: '0' }),
      ])
    ).toBeNull();
  });
});

describe('computeFeeRangeTrend', () => {
  it('computes direction and percent change from oldest to newest fee', () => {
    expect(computeFeeRangeTrend([0.01, 0.015])?.direction).toBe('up');
    expect(computeFeeRangeTrend([0.01, 0.015])?.deltaPercent).toBeCloseTo(50);

    expect(computeFeeRangeTrend([0.02, 0.01])?.direction).toBe('down');
    expect(computeFeeRangeTrend([0.02, 0.01])?.deltaPercent).toBeCloseTo(-50);
  });

  it('reports stable changes inside the threshold', () => {
    const trend = computeFeeRangeTrend([0.01, 0.01005]);

    expect(trend?.direction).toBe('stable');
    expect(trend?.deltaPercent).toBeCloseTo(0.5);
  });

  it('skips missing or zero fees before finding the range endpoints', () => {
    const trend = computeFeeRangeTrend([0, undefined, '0.01', '0.02']);

    expect(trend?.direction).toBe('up');
    expect(trend?.deltaPercent).toBeCloseTo(100);
    expect(computeFeeRangeTrend([0, undefined, 'not-a-number'])).toBeNull();
  });
});

describe('compareToWindows', () => {
  it('reports how far the current fee sits from each window average', () => {
    const comparisons = compareToWindows(0.02, [
      makeWindow('1h', 0.01),
      makeWindow('24h', 0.04),
    ]);

    expect(comparisons).toHaveLength(2);
    expect(comparisons[0].deltaPercent).toBeCloseTo(100);
    expect(comparisons[1].deltaPercent).toBeCloseTo(-50);
  });

  it('skips windows without a positive average', () => {
    expect(compareToWindows(0.02, [makeWindow('1h', 0)])).toEqual([]);
  });
});

describe('parseGwei', () => {
  it('parses decimal strings and rejects bad input', () => {
    expect(parseGwei('0.0104792')).toBeCloseTo(0.0104792);
    expect(parseGwei(undefined)).toBe(0);
    expect(parseGwei('not-a-number')).toBe(0);
    expect(parseGwei('-1')).toBe(0);
  });
});

describe('formatFeeNumber', () => {
  it('keeps readable significant digits at any magnitude', () => {
    expect(formatFeeNumber(0.0104792)).toBe('0.01048');
    expect(formatFeeNumber(123.456)).toBe('123.5');
    expect(formatFeeNumber(0.000000001)).toBe('0.000000001');
    expect(formatFeeNumber(0)).toBe('0');
    expect(formatFeeNumber(Number.NaN)).toBe('0');
  });

  it('switches to compact scientific notation for runaway fees', () => {
    expect(formatFeeNumber(2.838e22)).toBe('2.84e22');
    expect(formatFeeNumber(55.32e21)).toBe('5.53e22');
    // Below the 1e9 Gwei threshold stays positional.
    expect(formatFeeNumber(999_999_999)).toBe('1,000,000,000');
    expect(formatFeeNumber(1e9)).toBe('1e9');
  });
});

describe('formatSignedPercent', () => {
  it('formats signed deltas', () => {
    expect(formatSignedPercent(212.4)).toBe('+212%');
    expect(formatSignedPercent(-38.25)).toBe('-38.3%');
    expect(formatSignedPercent(0)).toBe('0%');
  });
});

describe('getBucketHint', () => {
  it('describes the real bucket width instead of the backend granularity', () => {
    // A backfilling 30d response reports granularity "hour" with 6h buckets.
    expect(getBucketHint({ granularity: 'hour', bucket_seconds: 21600 })).toBe('6-hour buckets');
    expect(getBucketHint({ granularity: 'minute', bucket_seconds: 300 })).toBe('5-minute buckets');
    expect(getBucketHint({ granularity: 'hour', bucket_seconds: 3600 })).toBe('hourly buckets');
    expect(getBucketHint({ granularity: 'day', bucket_seconds: 86400 })).toBe('daily buckets');
  });

  it('scales with the merged bucket count', () => {
    expect(getBucketHint({ granularity: 'hour', bucket_seconds: 21600 }, 4)).toBe('daily buckets');
    expect(getBucketHint({ granularity: 'hour', bucket_seconds: 21600 }, 5)).toBe('30-hour buckets');
  });

  it('falls back to the granularity when the bucket width is missing', () => {
    expect(getBucketHint({ granularity: 'hour', bucket_seconds: 0 })).toBe('hourly buckets');
    expect(getBucketHint({ granularity: 'epoch', bucket_seconds: Number.NaN })).toBe('epoch buckets');
  });
});

describe('getBucketStripHint', () => {
  const chart = { granularity: 'hour', bucket_seconds: 21600 };

  it('uses the real bucket width even when each bar is a single bucket', () => {
    const bars = groupChartPointsForStrip([
      makeChartPoint({ timestamp: '2026-07-05T00:00:00Z' }),
      makeChartPoint({ timestamp: '2026-07-05T06:00:00Z' }),
      makeChartPoint({ timestamp: '2026-07-05T12:00:00Z' }),
    ]);
    expect(getBucketStripHint(chart, bars)).toBe('6-hour buckets');
  });

  it('describes the merged bar span', () => {
    const points = Array.from({ length: 48 }, (_, index) =>
      makeChartPoint({ timestamp: `2026-07-0${1 + Math.floor(index / 24)}T00:00:00Z` })
    );
    const bars = groupChartPointsForStrip(points, 12);
    expect(getBucketStripHint(chart, bars)).toBe('daily buckets');
  });

  it('falls back to the single-bucket width for an empty strip', () => {
    expect(getBucketStripHint(chart, [])).toBe('6-hour buckets');
  });
});
