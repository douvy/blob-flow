import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useChartData } from './useChartData';
import { TimeRangeProvider } from '../contexts/TimeRangeContext';
import { createQueryWrapper } from '../test/queryClient';

const originalFetch = global.fetch;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TimeRangeProvider, null, children);
}

const mockPricing = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    current_base_fee: '2000000000',
    current_base_fee_gwei: '2',
    current_excess_gas: 0,
    current_utilization: '0.5',
    predicted_next_fee: '1900000000',
    predicted_next_fee_gwei: '1.9',
    fork_stage: 'BPO2',
    blob_params: {
      target: 14,
      max: 21,
      update_fraction: 11684671,
      target_gas: 1835008,
      max_gas: 2752512,
    },
    market_pressure: {
      recent_blocks_above_target: 0,
      consecutive_full_blocks: 0,
      percent_recent_blocks_at_max_blobs: 0,
      predicted_direction: 'down',
      next_block_fee_estimate: {
        low: '1800000000',
        high: '2100000000',
      },
    },
    recent_blocks: [
      {
        block_number: 101,
        block_timestamp: '2026-01-01T00:00:24.000Z',
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
      {
        block_number: 100,
        block_timestamp: '2026-01-01T00:00:12.000Z',
        blob_count: 2,
        blob_gas_used: 262144,
        blob_gas_target: 1835008,
        blob_gas_limit: 2752512,
        excess_blob_gas: 0,
        blob_base_fee: '1000000000',
        blob_base_fee_gwei: '1',
        utilization_ratio: '0.142857',
        blob_params_target: 14,
        blob_params_max: 21,
        target_blobs: 14,
        max_blobs: 21,
        available_blobs: 19,
        utilization_percent: 9.52,
        is_full: false,
        is_above_target: false,
        update_fraction: 11684671,
      },
    ],
  },
};

const mockStatsWindows = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    generated_at: '2026-01-01T00:01:00.000Z',
    windows: [
      {
        window: '5m',
        duration_seconds: 300,
        start_time: '2025-12-31T23:56:00.000Z',
        end_time: '2026-01-01T00:01:00.000Z',
        average_blob_base_fee: '1000000000',
        median_blob_base_fee: '1000000000',
        p95_blob_base_fee: '2000000000',
        total_blobs: 5,
        total_blob_gas_used: 655360,
        average_utilization: '0.1',
        total_cost_eth: '1000000000000000',
        unique_senders: 3,
      },
      {
        window: '24h',
        duration_seconds: 86400,
        start_time: '2025-12-31T00:01:00.000Z',
        end_time: '2026-01-01T00:01:00.000Z',
        average_blob_base_fee: '1500000000',
        median_blob_base_fee: '1000000000',
        p95_blob_base_fee: '2500000000',
        total_blobs: 100,
        total_blob_gas_used: 13107200,
        average_utilization: '0.5',
        total_cost_eth: '1000000000000000000',
        unique_senders: 12,
      },
    ],
  },
};

const mockStats = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    total_blobs: 100,
    total_confirmed_blobs: 90,
    total_pending_blobs: 5,
    average_base_fee: '1500000000',
    average_tip: '150000000',
    average_total_cost: '750000000000000',
    last_indexed_block: 101,
    last_indexed_time: '2026-01-01T00:01:00.000Z',
  },
};

function createFetchMock(
  pricingResponse: typeof mockPricing = mockPricing,
  statsWindowsResponse: typeof mockStatsWindows = mockStatsWindows
) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/blob/pricing')) {
      return Promise.resolve({
        ok: true,
        json: async () => pricingResponse,
      });
    }
    if (url.includes('/stats/windows')) {
      return Promise.resolve({
        ok: true,
        json: async () => statsWindowsResponse,
      });
    }
    if (url.includes('/stats')) {
      return Promise.resolve({
        ok: true,
        json: async () => mockStats,
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });
  });
}

describe('useChartData', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns chartData from pricing blocks and rolling stats', async () => {
    const fetchMock = createFetchMock();

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));

    expect(result.current.chartData).not.toBeNull();
    expect(result.current.dataPoints).toBe(2);
    expect(result.current.timeRange).toBe('24h');
    expect(result.current.chartData!.baseFee.map((point) => point.blockNumber)).toEqual([100, 101]);
    expect(result.current.chartData!.gasUtilization[0].targetGas).toBe(1835008);
    expect(result.current.chartData!.rollingWindows).toHaveLength(2);
    expect(result.current.chartData!.selectedWindow?.window).toBe('24h');
    expect(result.current.chartData!.indicators.pendingBlobCount).toBe(5);
    expect(urls.some((url) => url.includes('/blob/latest'))).toBe(false);
    expect(urls.some((url) => url.includes('/blob/pricing?blocks=120'))).toBe(true);
    expect(urls.some((url) => url.includes('/stats/windows?windows=5m,1h,24h,7d,30d'))).toBe(true);
  });

  it('keeps rolling stats available when no recent pricing blocks are returned', async () => {
    const fetchMock = createFetchMock({
      ...mockPricing,
      data: {
        ...mockPricing.data,
        recent_blocks: [],
      },
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chartData).not.toBeNull();
    expect(result.current.chartData!.baseFee).toEqual([]);
    expect(result.current.chartData!.selectedWindow?.totalBlobs).toBe(100);
    expect(result.current.dataPoints).toBe(0);
  });

  it('reports error when API fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.chartData).toBeNull();
  });
});
