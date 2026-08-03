import { describe, expect, it } from 'vitest';
import {
  deriveBlobRecords,
  MILESTONE_ENTITY_LIMIT,
  nextBlobMilestone,
  RECORDS_TOP_LIMIT,
  type BlobRecordSources,
} from './records';
import type {
  BackendAttributionUsageShare,
  BackendBlobStreakRun,
  BackendStatsWindow,
} from '../types';

function makeWindow(overrides: Partial<BackendStatsWindow>): BackendStatsWindow {
  return {
    window: '24h',
    duration_seconds: 86_400,
    start_time: '2026-08-01T00:00:00Z',
    end_time: '2026-08-02T00:00:00Z',
    total_blobs: 0,
    total_blob_gas_used: 0,
    average_utilization: '0',
    unique_senders: 0,
    ...overrides,
  };
}

function makeShare(
  overrides: Partial<BackendAttributionUsageShare>
): BackendAttributionUsageShare {
  return {
    key: 'base',
    name: 'Base',
    category: 'rollup',
    blob_count: 0,
    total_cost_wei: '0',
    blob_share_percent: 0,
    spend_share_percent: 0,
    ...overrides,
  };
}

function makeRun(overrides: Partial<BackendBlobStreakRun>): BackendBlobStreakRun {
  return {
    length: 1,
    start_block: 100,
    end_block: 100,
    start_timestamp: '2026-07-01T00:00:00Z',
    end_timestamp: '2026-07-01T00:00:12Z',
    ...overrides,
  };
}

const EMPTY_SOURCES: BlobRecordSources = {
  pricing: null,
  statsWindows: null,
  stats: null,
  attribution: null,
  records: null,
};

const EMPTY_RECORDS = {
  full_block_streaks: { current: null, top: [] },
  above_target_streaks: { current: null, top: [] },
  base_fee_peaks: [],
  busiest_hours: [],
};

describe('nextBlobMilestone', () => {
  it('walks the 1/2/5 ladder', () => {
    expect(nextBlobMilestone(0)).toBe(10);
    expect(nextBlobMilestone(37)).toBe(50);
    expect(nextBlobMilestone(999)).toBe(1_000);
    expect(nextBlobMilestone(4_812_332)).toBe(5_000_000);
  });

  it('is strictly above the count, so a reached milestone rolls to the next', () => {
    expect(nextBlobMilestone(5_000_000)).toBe(10_000_000);
    expect(nextBlobMilestone(10)).toBe(20);
  });

  it('treats malformed counts as zero', () => {
    expect(nextBlobMilestone(Number.NaN)).toBe(10);
    expect(nextBlobMilestone(-5)).toBe(10);
  });
});

describe('deriveBlobRecords', () => {
  it('returns null sections and empty rankings when every source is missing', () => {
    expect(deriveBlobRecords(EMPTY_SOURCES)).toEqual({
      streak: null,
      fullBlockStreaks: null,
      aboveTargetStreaks: null,
      feePeaks: null,
      busiestHours: null,
      peakWindowFee: null,
      busiestWindow: null,
      topSpenders: [],
      allTime: null,
      milestones: [],
    });
  });

  it('maps market pressure onto the live streak record', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      pricing: {
        marketPressure: {
          recentBlocksAboveTarget: 14,
          consecutiveFullBlocks: 7,
          percentRecentBlocksAtMaxBlobs: 35,
          predictedDirection: 'up',
          nextBlockFeeEstimate: { low: '1 Gwei', high: '2 Gwei' },
        },
      },
    });

    expect(records.streak).toEqual({
      consecutiveFullBlocks: 7,
      recentBlocksAboveTarget: 14,
      percentRecentBlocksAtMaxBlobs: 35,
    });
  });

  it('maps streak boards, re-sorting and capping the top list', () => {
    const top = Array.from({ length: RECORDS_TOP_LIMIT + 3 }, (_, index) =>
      makeRun({ length: index + 2, end_block: 1_000 + index })
    );

    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      records: {
        ...EMPTY_RECORDS,
        full_block_streaks: {
          current: makeRun({ length: 3, end_block: 9_999 }),
          top,
        },
      },
    });

    expect(records.fullBlockStreaks?.top).toHaveLength(RECORDS_TOP_LIMIT);
    expect(records.fullBlockStreaks?.top[0]).toMatchObject({
      length: RECORDS_TOP_LIMIT + 4,
    });
    expect(records.fullBlockStreaks?.current).toMatchObject({
      length: 3,
      endBlock: 9_999,
    });
    expect(records.aboveTargetStreaks).toEqual({ current: null, top: [] });
  });

  it('sorts fee peaks by fee and falls back to the wei field for gwei', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      records: {
        ...EMPTY_RECORDS,
        base_fee_peaks: [
          {
            block_number: 1,
            timestamp: '2026-01-01T00:00:00Z',
            blob_base_fee: '2000000000',
            blob_base_fee_gwei: '',
            blob_count: 6,
          },
          {
            block_number: 2,
            timestamp: '2026-02-01T00:00:00Z',
            blob_base_fee: '5000000000',
            blob_base_fee_gwei: '5',
            blob_count: 6,
          },
        ],
      },
    });

    expect(records.feePeaks).toEqual([
      { blockNumber: 2, timestamp: '2026-02-01T00:00:00Z', feeGwei: 5, blobCount: 6 },
      { blockNumber: 1, timestamp: '2026-01-01T00:00:00Z', feeGwei: 2, blobCount: 6 },
    ]);
  });

  it('sorts busiest hours by blob count', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      records: {
        ...EMPTY_RECORDS,
        busiest_hours: [
          { hour_start: '2026-01-01T04:00:00Z', blob_count: 900, total_cost_wei: '1' },
          { hour_start: '2026-01-01T05:00:00Z', blob_count: 1_200, total_cost_wei: '2' },
        ],
      },
    });

    expect(records.busiestHours?.map((hour) => hour.blobCount)).toEqual([1_200, 900]);
  });

  it('picks the window with the highest p95 fee, preferring the wei field', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      statsWindows: {
        windows: [
          makeWindow({ window: '1h', p95_blob_base_fee_wei: '2000000000' }),
          makeWindow({ window: '24h', p95_blob_base_fee_wei: '5000000000' }),
          makeWindow({ window: '7d', p95_blob_base_fee: '3000000000' }),
        ],
      },
    });

    expect(records.peakWindowFee).toMatchObject({ window: '24h', p95Gwei: 5 });
    expect(records.peakWindowFee?.perWindow).toEqual([
      { window: '1h', p95Gwei: 2 },
      { window: '24h', p95Gwei: 5 },
      { window: '7d', p95Gwei: 3 },
    ]);
  });

  it('picks the busiest window by blob rate, not raw count', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      statsWindows: {
        windows: [
          // 1200/hr beats the 30d window's 1000/hr despite far fewer blobs.
          makeWindow({ window: '1h', duration_seconds: 3_600, total_blobs: 1_200 }),
          makeWindow({
            window: '30d',
            duration_seconds: 2_592_000,
            total_blobs: 720_000,
          }),
        ],
      },
    });

    expect(records.busiestWindow).toMatchObject({
      window: '1h',
      totalBlobs: 1_200,
      blobsPerHour: 1_200,
    });
  });

  it('ignores zero-duration windows and returns null when none remain', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      statsWindows: {
        windows: [makeWindow({ window: '5m', duration_seconds: 0, total_blobs: 10 })],
      },
    });

    expect(records.busiestWindow).toBeNull();
  });

  it('ranks spenders by wei cost, skipping aggregate buckets and capping', () => {
    const entityShares = Array.from({ length: RECORDS_TOP_LIMIT + 2 }, (_, index) =>
      makeShare({
        key: `rollup_${index}`,
        name: `Rollup ${index}`,
        total_cost_wei: `${(index + 1) * 10}000000000000000000`,
      })
    );

    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      attribution: {
        summary: {
          total_blobs: 100,
          total_cost_wei: '0',
          shares: [
            makeShare({
              key: 'unknown',
              name: 'Unknown',
              category: 'unknown',
              total_cost_wei: '999000000000000000000000',
            }),
            ...entityShares,
          ],
        },
      },
    });

    expect(records.topSpenders).toHaveLength(RECORDS_TOP_LIMIT);
    expect(records.topSpenders[0]).toMatchObject({
      key: `rollup_${RECORDS_TOP_LIMIT + 1}`,
    });
    expect(
      records.topSpenders.some((spender) => spender.key === 'unknown')
    ).toBe(false);
  });

  it('builds milestone progress for the largest entities, capped and sorted', () => {
    const shares = Array.from({ length: MILESTONE_ENTITY_LIMIT + 2 }, (_, index) =>
      makeShare({
        key: `rollup_${index}`,
        name: `Rollup ${index}`,
        blob_count: (index + 1) * 1_000,
      })
    );

    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      attribution: {
        summary: { total_blobs: 0, total_cost_wei: '0', shares },
      },
    });

    expect(records.milestones).toHaveLength(MILESTONE_ENTITY_LIMIT);
    expect(records.milestones[0]).toMatchObject({
      key: `rollup_${MILESTONE_ENTITY_LIMIT + 1}`,
      blobCount: (MILESTONE_ENTITY_LIMIT + 2) * 1_000,
    });
  });

  it('computes milestone distance and progress', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      attribution: {
        summary: {
          total_blobs: 0,
          total_cost_wei: '0',
          shares: [
            makeShare({ key: 'base', name: 'Base', blob_count: 4_812_332 }),
          ],
        },
      },
    });

    expect(records.milestones[0]).toMatchObject({
      blobCount: 4_812_332,
      nextMilestone: 5_000_000,
      remainingToMilestone: 187_668,
    });
    expect(records.milestones[0].progressPercent).toBeCloseTo(96.24664, 4);
  });

  it('maps all-time stats totals', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      stats: {
        data: {
          averageBaseFee: '12.3 Gwei',
          totalBlobs: 21_000_000,
          totalConfirmedBlobs: 20_999_000,
          pendingBlobsCount: 1_000,
          avgBlobsPerBlock: 4.2,
          averageTip: '0.1 Gwei',
          averageTotalCost: '0.001 ETH',
          lastIndexedBlock: 23_000_000,
          lastIndexedTime: '2026-08-02T00:00:00Z',
        },
      },
    });

    expect(records.allTime).toEqual({
      totalBlobs: 21_000_000,
      averageBaseFee: '12.3 Gwei',
    });
  });
});
