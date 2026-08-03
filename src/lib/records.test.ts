import { describe, expect, it } from 'vitest';
import {
  deriveBlobRecords,
  MILESTONE_ENTITY_LIMIT,
  nextBlobMilestone,
  type BlobRecordSources,
} from './records';
import type { BackendAttributionUsageShare, BackendStatsWindow } from '../types';

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

const EMPTY_SOURCES: BlobRecordSources = {
  pricing: null,
  statsWindows: null,
  stats: null,
  attribution: null,
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
  it('returns null sections and no milestones when every source is missing', () => {
    expect(deriveBlobRecords(EMPTY_SOURCES)).toEqual({
      streak: null,
      peakWindowFee: null,
      busiestWindow: null,
      biggestSpender: null,
      allTime: null,
      milestones: [],
    });
  });

  it('maps market pressure onto the streak record', () => {
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

  it('crowns the biggest spender by wei cost, skipping aggregate buckets', () => {
    const records = deriveBlobRecords({
      ...EMPTY_SOURCES,
      attribution: {
        summary: {
          total_blobs: 100,
          total_cost_wei: '90000000000000000000',
          shares: [
            makeShare({
              key: 'unknown',
              name: 'Unknown',
              category: 'unknown',
              total_cost_wei: '50000000000000000000',
            }),
            makeShare({
              key: 'base',
              name: 'Base',
              total_cost_wei: '30000000000000000000',
              spend_share_percent: 33.3,
              blob_count: 60,
            }),
            makeShare({
              key: 'arbitrum_one',
              name: 'Arbitrum One',
              total_cost_wei: '10000000000000000000',
            }),
          ],
        },
      },
    });

    expect(records.biggestSpender).toEqual({
      key: 'base',
      name: 'Base',
      category: 'rollup',
      totalCostWei: '30000000000000000000',
      spendSharePercent: 33.3,
      blobCount: 60,
    });
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
