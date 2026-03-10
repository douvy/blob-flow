import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useChartData } from './useChartData';
import { TimeRangeProvider } from '../contexts/TimeRangeContext';

const originalFetch = global.fetch;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TimeRangeProvider, null, children);
}

const mockBlobs = [
  {
    network_id: 1,
    network_name: 'sepolia',
    block_number: 100,
    blob_index: 0,
    tx_hash: '0xabc',
    from_address: '0x123',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1000000000',
    tip_per_blob_gas: '100000000',
    total_cost_eth: '500000000000000',
    timestamp: new Date().toISOString(),
    confirmed: true,
    user_attribution: 'Arbitrum',
    blob_gas_used: 131072,
  },
  {
    network_id: 1,
    network_name: 'sepolia',
    block_number: 101,
    blob_index: 0,
    tx_hash: '0xdef',
    from_address: '0x456',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '2000000000',
    tip_per_blob_gas: '200000000',
    total_cost_eth: '1000000000000000',
    timestamp: new Date().toISOString(),
    confirmed: true,
    user_attribution: 'Optimism',
    blob_gas_used: 131072,
  },
];

const mockStats = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'sepolia',
    total_blobs: 100,
    total_confirmed_blobs: 90,
    total_pending_blobs: 5,
    average_base_fee: '1500000000',
    average_tip: '150000000',
    average_total_cost: '750000000000000',
    last_indexed_block: 101,
    last_indexed_time: new Date().toISOString(),
  },
};

describe('useChartData', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns chartData with aggregated data when blobs are available', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/blob/latest')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: mockBlobs }),
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

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chartData).not.toBeNull();
    expect(result.current.dataPoints).toBe(2);
    expect(result.current.timeRange).toBe('24h');
    expect(result.current.chartData!.baseFee.length).toBeGreaterThan(0);
    expect(result.current.chartData!.gasUtilization.length).toBeGreaterThan(0);
    expect(result.current.chartData!.l2Usage.length).toBeGreaterThan(0);
    expect(result.current.chartData!.costComparison.length).toBeGreaterThan(0);
    expect(result.current.chartData!.indicators.pendingBlobCount).toBe(5);
  });

  it('returns null chartData when no blobs are returned', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/blob/latest')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockStats,
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chartData).toBeNull();
    expect(result.current.dataPoints).toBe(0);
  });

  it('reports error when API fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.chartData).toBeNull();
  });
});
