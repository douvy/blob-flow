import {
  buildChartDataset,
  getRequestedRollingWindow,
  selectRollingWindow,
  transformStatsWindows,
} from './chartAggregation';
import type {
  BackendStatsWindow,
  BackendStatsWindowsResponse,
  BlobPricingResponse,
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

const pricing: BlobPricingResponse = {
  network_id: 1,
  network_name: 'mainnet',
  current_base_fee: '4000000000',
  current_base_fee_gwei: '4',
  current_excess_gas: 0,
  current_utilization: '1.142857',
  predicted_next_fee: '3900000000',
  predicted_next_fee_gwei: '3.9',
  fork_stage: 'BPO2',
  blob_params: {
    target: 14,
    max: 21,
    update_fraction: 11684671,
    target_gas: 1835008,
    max_gas: 2752512,
  },
  market_pressure: {
    recent_blocks_above_target: 1,
    consecutive_full_blocks: 0,
    percent_recent_blocks_at_max_blobs: 0,
    predicted_direction: 'down',
    next_block_fee_estimate: {
      low: '3500000000',
      high: '4500000000',
    },
  },
  recent_blocks: [
    {
      block_number: 2,
      block_timestamp: '2026-01-01T00:00:24.000Z',
      blob_count: 16,
      blob_gas_used: 2097152,
      blob_gas_target: 1835008,
      blob_gas_limit: 2752512,
      excess_blob_gas: 0,
      blob_base_fee: '4000000000',
      blob_base_fee_gwei: '4',
      utilization_ratio: '1.142857',
      blob_params_target: 14,
      blob_params_max: 21,
      target_blobs: 14,
      max_blobs: 21,
      available_blobs: 5,
      utilization_percent: 76.19,
      is_full: false,
      is_above_target: true,
      update_fraction: 11684671,
    },
    {
      block_number: 1,
      block_timestamp: '2026-01-01T00:00:12.000Z',
      blob_count: 7,
      blob_gas_used: 917504,
      blob_gas_target: 1835008,
      blob_gas_limit: 2752512,
      excess_blob_gas: 0,
      blob_base_fee: '2000000000',
      blob_base_fee_gwei: '2',
      utilization_ratio: '0.5',
      blob_params_target: 14,
      blob_params_max: 21,
      target_blobs: 14,
      max_blobs: 21,
      available_blobs: 14,
      utilization_percent: 33.33,
      is_full: false,
      is_above_target: false,
      update_fraction: 11684671,
    },
  ],
};

describe('chartAggregation', () => {
  it('maps range selection to rolling stats windows', () => {
    expect(getRequestedRollingWindow('24h')).toBe('24h');
    expect(getRequestedRollingWindow('7d')).toBe('7d');
    expect(getRequestedRollingWindow('30d')).toBe('30d');
    expect(getRequestedRollingWindow('All')).toBe('30d');

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
    ]));

    expect(windows[0]).toMatchObject({
      window: '24h',
      averageBaseFeeGwei: 1.5,
      medianBaseFeeGwei: 0.9,
      p95BaseFeeGwei: 2.5,
      averageUtilizationPct: 42.12,
      totalCostEth: 1,
    });
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
});
