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
} from '../types';

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

const EMPTY_BOARD = { current: null, top: [] };

const EMPTY_RECORDS: BlobRecordSources['records'] = {
  full_block_streaks: EMPTY_BOARD,
  above_target_streaks: EMPTY_BOARD,
  below_target_streaks: EMPTY_BOARD,
  base_fee_peaks: [],
  most_expensive_blocks: [],
  busiest_hours: [],
  busiest_days: [],
  highest_utilization_days: [],
};

function makeSources(overrides: Partial<BlobRecordSources> = {}): BlobRecordSources {
  return {
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
    attribution: {
      summary: { total_blobs: 0, total_cost_wei: '0', shares: [] },
      points: [],
    },
    records: EMPTY_RECORDS,
    ...overrides,
  };
}

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
  it('maps empty payloads onto empty boards and rankings', () => {
    expect(deriveBlobRecords(makeSources())).toEqual({
      fullBlockStreaks: { current: null, top: [] },
      aboveTargetStreaks: { current: null, top: [] },
      belowTargetStreaks: { current: null, top: [] },
      feePeaks: [],
      expensiveBlocks: [],
      busiestHours: [],
      busiestDays: [],
      priciestDays: [],
      utilizationDays: [],
      topSpenders: [],
      allTime: { totalBlobs: 21_000_000, averageBaseFee: '12.3 Gwei' },
      milestones: [],
    });
  });

  it('maps every streak board, re-sorting and capping the top lists', () => {
    const top = Array.from({ length: RECORDS_TOP_LIMIT + 3 }, (_, index) =>
      makeRun({ length: index + 2, end_block: 1_000 + index })
    );

    const records = deriveBlobRecords(
      makeSources({
        records: {
          ...EMPTY_RECORDS,
          full_block_streaks: {
            current: makeRun({ length: 3, end_block: 9_999 }),
            top,
          },
        },
      })
    );

    expect(records.fullBlockStreaks.top).toHaveLength(RECORDS_TOP_LIMIT);
    expect(records.fullBlockStreaks.top[0]).toMatchObject({
      length: RECORDS_TOP_LIMIT + 4,
    });
    expect(records.fullBlockStreaks.current).toMatchObject({
      length: 3,
      endBlock: 9_999,
    });
    expect(records.aboveTargetStreaks).toEqual({ current: null, top: [] });
    expect(records.belowTargetStreaks).toEqual({ current: null, top: [] });
  });

  it('sorts fee peaks by fee and falls back to the wei field for gwei', () => {
    const records = deriveBlobRecords(
      makeSources({
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
      })
    );

    expect(records.feePeaks).toEqual([
      { blockNumber: 2, timestamp: '2026-02-01T00:00:00Z', feeGwei: 5, blobCount: 6 },
      { blockNumber: 1, timestamp: '2026-01-01T00:00:00Z', feeGwei: 2, blobCount: 6 },
    ]);
  });

  it('sorts most expensive blocks by wei spend', () => {
    const records = deriveBlobRecords(
      makeSources({
        records: {
          ...EMPTY_RECORDS,
          most_expensive_blocks: [
            {
              block_number: 10,
              timestamp: '2026-01-01T00:00:00Z',
              blob_count: 3,
              blob_base_fee: '1',
              blob_base_fee_gwei: '0.000000001',
              total_cost_wei: '5000000000000000000',
            },
            {
              block_number: 11,
              timestamp: '2026-01-02T00:00:00Z',
              blob_count: 6,
              blob_base_fee: '2',
              blob_base_fee_gwei: '0.000000002',
              total_cost_wei: '90000000000000000000',
            },
          ],
        },
      })
    );

    expect(records.expensiveBlocks.map((block) => block.blockNumber)).toEqual([
      11, 10,
    ]);
  });

  it('sorts busiest hours and days by blob count', () => {
    const records = deriveBlobRecords(
      makeSources({
        records: {
          ...EMPTY_RECORDS,
          busiest_hours: [
            { hour_start: '2026-01-01T04:00:00Z', blob_count: 900, total_cost_wei: '1' },
            { hour_start: '2026-01-01T05:00:00Z', blob_count: 1_200, total_cost_wei: '2' },
          ],
          busiest_days: [
            { day_start: '2026-01-01T00:00:00Z', blob_count: 9_000, total_cost_wei: '1' },
            { day_start: '2026-02-01T00:00:00Z', blob_count: 12_000, total_cost_wei: '2' },
          ],
        },
      })
    );

    expect(records.busiestHours.map((hour) => hour.blobCount)).toEqual([1_200, 900]);
    expect(records.busiestDays.map((day) => day.blobCount)).toEqual([12_000, 9_000]);
  });

  it('sorts utilization days by mean utilization', () => {
    const records = deriveBlobRecords(
      makeSources({
        records: {
          ...EMPTY_RECORDS,
          highest_utilization_days: [
            {
              day_start: '2026-01-01T00:00:00Z',
              average_utilization_percent: 74.2,
              block_count: 7_100,
              blob_count: 30_000,
              blocks_at_max: 900,
              blocks_above_target: 3_000,
            },
            {
              day_start: '2026-02-01T00:00:00Z',
              average_utilization_percent: 87.4,
              block_count: 7_150,
              blob_count: 39_000,
              blocks_at_max: 1_200,
              blocks_above_target: 5_300,
            },
          ],
        },
      })
    );

    expect(records.utilizationDays[0]).toMatchObject({
      dayStart: '2026-02-01T00:00:00Z',
      averageUtilizationPercent: 87.4,
    });
  });

  it('ranks spenders by wei cost, skipping aggregate buckets and capping', () => {
    const entityShares = Array.from({ length: RECORDS_TOP_LIMIT + 2 }, (_, index) =>
      makeShare({
        key: `rollup_${index}`,
        name: `Rollup ${index}`,
        total_cost_wei: `${(index + 1) * 10}000000000000000000`,
      })
    );

    const records = deriveBlobRecords(
      makeSources({
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
          points: [],
        },
      })
    );

    expect(records.topSpenders).toHaveLength(RECORDS_TOP_LIMIT);
    expect(records.topSpenders[0]).toMatchObject({
      key: `rollup_${RECORDS_TOP_LIMIT + 1}`,
    });
    expect(
      records.topSpenders.some((spender) => spender.key === 'unknown')
    ).toBe(false);
  });

  it('ranks priciest days by network-wide spend summed across series', () => {
    const records = deriveBlobRecords(
      makeSources({
        attribution: {
          summary: { total_blobs: 0, total_cost_wei: '0', shares: [] },
          points: [
            {
              timestamp: '2024-06-20T00:00:00Z',
              values: {
                base: { blob_count: 9_000, total_cost_wei: '200000000000000000000', blob_gas_used: 0 },
                unknown: { blob_count: 2_000, total_cost_wei: '49000000000000000000', blob_gas_used: 0 },
              },
            },
            {
              timestamp: '2024-04-02T00:00:00Z',
              values: {
                base: { blob_count: 21_000, total_cost_wei: '170000000000000000000', blob_gas_used: 0 },
              },
            },
          ],
        },
      })
    );

    expect(records.priciestDays).toEqual([
      {
        dayStart: '2024-06-20T00:00:00Z',
        blobCount: 11_000,
        totalCostWei: '249000000000000000000',
      },
      {
        dayStart: '2024-04-02T00:00:00Z',
        blobCount: 21_000,
        totalCostWei: '170000000000000000000',
      },
    ]);
  });

  it('builds milestone progress for the largest entities, capped and sorted', () => {
    const shares = Array.from({ length: MILESTONE_ENTITY_LIMIT + 2 }, (_, index) =>
      makeShare({
        key: `rollup_${index}`,
        name: `Rollup ${index}`,
        blob_count: (index + 1) * 1_000,
      })
    );

    const records = deriveBlobRecords(
      makeSources({
        attribution: {
          summary: { total_blobs: 0, total_cost_wei: '0', shares },
          points: [],
        },
      })
    );

    expect(records.milestones).toHaveLength(MILESTONE_ENTITY_LIMIT);
    expect(records.milestones[0]).toMatchObject({
      key: `rollup_${MILESTONE_ENTITY_LIMIT + 1}`,
      blobCount: (MILESTONE_ENTITY_LIMIT + 2) * 1_000,
    });
  });

  it('computes milestone distance and progress', () => {
    const records = deriveBlobRecords(
      makeSources({
        attribution: {
          summary: {
            total_blobs: 0,
            total_cost_wei: '0',
            shares: [
              makeShare({ key: 'base', name: 'Base', blob_count: 4_812_332 }),
            ],
          },
          points: [],
        },
      })
    );

    expect(records.milestones[0]).toMatchObject({
      blobCount: 4_812_332,
      nextMilestone: 5_000_000,
      remainingToMilestone: 187_668,
    });
    expect(records.milestones[0].progressPercent).toBeCloseTo(96.24664, 4);
  });
});
