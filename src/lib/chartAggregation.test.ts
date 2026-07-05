import {
  buildChartDataset,
  getPricingBlockRequestLimit,
  getRequestedRollingWindow,
  selectRollingWindow,
  transformStatsWindows,
} from './chartAggregation';
import type {
  BackendStatsWindow,
  BackendStatsWindowsResponse,
  BlobPricing,
  NetworkStats,
  RollingWindowKey,
} from '../types';

function makeWindow(
  window: RollingWindowKey,
  durationSeconds: number,
  overrides: Partial<BackendStatsWindow> = {}
): BackendStatsWindow {
  return {
    window,
    duration_seconds: durationSeconds,
    start_time: '2026-01-01T00:00:00.000Z',
    end_time: '2026-01-02T00:00:00.000Z',
    average_blob_base_fee: '1500000000',
    median_blob_base_fee: '1000000000',
    p95_blob_base_fee: '2500000000',
    total_blobs: 100,
    total_blob_gas_used: 13107200,
    average_utilization: '0.5',
    total_cost_eth: '1000000000000000000',
    unique_senders: 12,
    ...overrides,
  };
}

function makeStatsWindows(windows: BackendStatsWindow[]): BackendStatsWindowsResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    generated_at: '2026-01-02T00:00:00.000Z',
    windows,
  };
}

const stats: NetworkStats = {
  averageBaseFee: '1 Gwei',
  totalBlobs: 1000,
  totalConfirmedBlobs: 900,
  pendingBlobsCount: 3,
  avgBlobsPerBlock: 1.2,
  averageTip: '0 Wei',
  averageTotalCost: '0 Wei',
  lastIndexedBlock: 101,
  lastIndexedTime: '2026-01-02T00:00:00.000Z',
};

const pricing: BlobPricing = {
  networkId: 1,
  networkName: 'mainnet',
  currentBaseFee: '4 Gwei',
  currentBaseFeeGwei: '4',
  currentExcessGas: 0,
  currentUtilization: 1.142857,
  predictedNextFee: '3.9 Gwei',
  predictedNextFeeGwei: '3.9',
  forkStage: 'BPO2',
  blobParams: {
    target: 14,
    max: 21,
    updateFraction: 11684671,
    targetGas: 1835008,
    maxGas: 2752512,
  },
  marketPressure: {
    recentBlocksAboveTarget: 1,
    consecutiveFullBlocks: 0,
    percentRecentBlocksAtMaxBlobs: 0,
    predictedDirection: 'down',
    nextBlockFeeEstimate: {
      low: '3.5 Gwei',
      high: '4.5 Gwei',
    },
  },
  recentBlocks: [
    {
      blockNumber: 2,
      blockTimestamp: '2026-01-01T00:00:24.000Z',
      blobCount: 16,
      blobGasUsed: 2097152,
      blobGasTarget: 1835008,
      blobGasLimit: 2752512,
      excessBlobGas: 0,
      blobBaseFee: '4 Gwei',
      blobBaseFeeGwei: '4',
      utilizationRatio: 1.142857,
      targetBlobs: 14,
      maxBlobs: 21,
      availableBlobs: 5,
      utilizationPercent: 76.19,
      isFull: false,
      isAboveTarget: true,
    },
    {
      blockNumber: 1,
      blockTimestamp: '2026-01-01T00:00:12.000Z',
      blobCount: 7,
      blobGasUsed: 917504,
      blobGasTarget: 1835008,
      blobGasLimit: 2752512,
      excessBlobGas: 0,
      blobBaseFee: '2 Gwei',
      blobBaseFeeGwei: '2',
      utilizationRatio: 0.5,
      targetBlobs: 14,
      maxBlobs: 21,
      availableBlobs: 14,
      utilizationPercent: 33.33,
      isFull: false,
      isAboveTarget: false,
    },
  ],
};

describe('chartAggregation', () => {
  it('maps range selection to rolling stats windows', () => {
    expect(getRequestedRollingWindow('24h')).toBe('24h');
    expect(getRequestedRollingWindow('7d')).toBe('7d');
    expect(getRequestedRollingWindow('30d')).toBe('30d');
    expect(getRequestedRollingWindow('All')).toBe('30d');
    expect(getPricingBlockRequestLimit('24h')).toBe(100);

    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('5m', 300),
      makeWindow('7d', 604800),
    ]));

    expect(selectRollingWindow(windows, 'All')?.window).toBe('7d');
  });

  it('transforms rolling stats values into display units', () => {
    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('24h', 86400, {
        average_blob_base_fee: '1500000000.5',
        median_blob_base_fee: '900000000',
        p95_blob_base_fee: '2500000000',
        average_utilization: '0.42123',
      }),
      makeWindow('1h', 3600, {
        total_cost_eth: '0.001',
      }),
    ]));

    expect(windows.find((window) => window.window === '24h')).toMatchObject({
      window: '24h',
      averageBaseFeeGwei: 1.5,
      medianBaseFeeGwei: 0.9,
      p95BaseFeeGwei: 2.5,
      averageUtilizationPct: 42.12,
      totalCostEth: 1,
    });
    expect(windows.find((window) => window.window === '1h')).toMatchObject({
      totalCostEth: 0.001,
    });
  });

  it('passes block counts through and drops malformed values', () => {
    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('24h', 86400, { total_blocks: 7200, blocks_above_target: 4812 }),
      makeWindow('1h', 3600, { total_blocks: Number.NaN, blocks_above_target: -1 }),
      makeWindow('5m', 300),
    ]));

    expect(windows.find((window) => window.window === '24h')).toMatchObject({
      totalBlocks: 7200,
      blocksAboveTarget: 4812,
    });

    const hourWindow = windows.find((window) => window.window === '1h');
    expect(hourWindow?.totalBlocks).toBeUndefined();
    expect(hourWindow?.blocksAboveTarget).toBeUndefined();

    const fiveMinuteWindow = windows.find((window) => window.window === '5m');
    expect(fiveMinuteWindow?.totalBlocks).toBeUndefined();
    expect(fiveMinuteWindow?.blocksAboveTarget).toBeUndefined();
  });

  it('builds chart data from pricing blocks and selected rolling stats', () => {
    const dataset = buildChartDataset(
      makeStatsWindows([
        makeWindow('24h', 86400, { total_blobs: 24 }),
        makeWindow('7d', 604800, { total_blobs: 700 }),
        makeWindow('30d', 2592000, { total_blobs: 3000 }),
      ]),
      pricing,
      'All',
      stats
    );

    expect(dataset.selectedWindow?.window).toBe('30d');
    expect(dataset.rollingCoverageLabel).toContain('All view uses the 30d');
    expect(dataset.baseFee.map((point) => point.blockNumber)).toEqual([1, 2]);
    expect(dataset.gasUtilization[1]).toMatchObject({
      blockNumber: 2,
      blobGasUsed: 2097152,
      targetGas: 1835008,
      maxGas: 2752512,
      blobCount: 16,
      utilizationPct: 114,
    });
    expect(dataset.indicators).toMatchObject({
      currentBaseFeeGwei: 4,
      averageBaseFeeGwei: 1.5,
      feeRatio: 2.67,
      pendingBlobCount: 3,
    });
    expect(dataset.coverageLabel).toContain('latest 2 pricing blocks');
  });

  it('filters pricing chart series to the selected rolling window', () => {
    const windowedPricing: BlobPricing = {
      ...pricing,
      recentBlocks: [
        {
          ...pricing.recentBlocks[0],
          blockNumber: 3,
          blockTimestamp: '2025-12-31T23:59:59.000Z',
          blobBaseFeeGwei: '9',
        },
        {
          ...pricing.recentBlocks[1],
          blockNumber: 4,
          blockTimestamp: '2026-01-01T00:30:00.000Z',
          blobBaseFeeGwei: '2',
        },
      ],
    };

    const dataset = buildChartDataset(
      makeStatsWindows([
        makeWindow('1h', 3600, {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-01T01:00:00.000Z',
        }),
      ]),
      windowedPricing,
      '1h',
      stats
    );

    expect(dataset.baseFee.map((point) => point.blockNumber)).toEqual([4]);
    expect(dataset.gasUtilization.map((point) => point.blockNumber)).toEqual([4]);
    expect(dataset.recentBlockCount).toBe(1);
    expect(dataset.chartRangeLabel).toBe('1h view');
    expect(dataset.blockCoverageLabel).toContain('within the 1h view');
  });
});
