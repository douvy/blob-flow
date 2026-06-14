import { describe, expect, it } from 'vitest';
import {
  compareToWindows,
  computeFeeRangeTrend,
  computeFeeTrend,
  formatFeeNumber,
  formatSignedPercent,
  mergeRecentPricingBlocks,
  parseGwei,
} from './blobFeeHero';
import type { BlobPricingRecentBlock, RollingWindowDataPoint } from '@/types';

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
  averageBaseFeeGwei: number
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
  };
}

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
});

describe('formatSignedPercent', () => {
  it('formats signed deltas', () => {
    expect(formatSignedPercent(212.4)).toBe('+212%');
    expect(formatSignedPercent(-38.25)).toBe('-38.3%');
    expect(formatSignedPercent(0)).toBe('0%');
  });
});
