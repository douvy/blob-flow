import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useChartData } from './useChartData';
import { TimeRangeProvider } from '../contexts/TimeRangeContext';
import { createQueryWrapper } from '../test/queryClient';

const originalFetch = global.fetch;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(TimeRangeProvider, null, children);
}

const mockMarket = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    range: '1h',
    granularity: 'minute',
    bucket_seconds: 60,
    start_time: '2026-01-01T00:00:00.000Z',
    end_time: '2026-01-01T01:00:00.000Z',
    generated_at: '2026-01-01T01:00:00.000Z',
    points: [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        start_block: 100,
        end_block: 100,
        average_blob_base_fee_gwei: '1',
        median_blob_base_fee_gwei: '1',
        p95_blob_base_fee_gwei: '1',
        blob_count: 2,
        blob_gas_used: 262144,
        blob_gas_target: 1835008,
        average_utilization: '0.142857',
        total_cost_wei: '1000000000000000',
        unique_senders: 2,
      },
      {
        timestamp: '2026-01-01T00:01:00.000Z',
        start_block: 101,
        end_block: 101,
        average_blob_base_fee_gwei: '2',
        median_blob_base_fee_gwei: '2',
        p95_blob_base_fee_gwei: '2',
        blob_count: 7,
        blob_gas_used: 917504,
        blob_gas_target: 1835008,
        blob_gas_limit: 3145728,
        average_utilization: '0.5',
        total_cost_wei: '2000000000000000',
        unique_senders: 3,
      },
    ],
    summary: {
      current_base_fee_gwei: '2',
      average_blob_base_fee_gwei: '1.25',
      median_blob_base_fee_gwei: '1',
      p95_blob_base_fee_gwei: '2',
      total_blobs: 10,
      total_blob_gas_used: 1179648,
      average_utilization: '0.25',
      total_cost_wei: '10000000000000000',
      unique_senders: 5,
    },
  },
};

const mockAttribution = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    range: '1h',
    granularity: 'minute',
    bucket_seconds: 60,
    start_time: '2026-01-01T00:00:00.000Z',
    end_time: '2026-01-01T01:00:00.000Z',
    generated_at: '2026-01-01T01:00:00.000Z',
    series: [
      { key: 'base', name: 'Base', category: 'rollup' },
      { key: 'unknown', name: 'Unknown', category: 'unknown' },
    ],
    points: [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        values: {
          base: { blob_count: 2, total_cost_wei: '1000000000000000', blob_gas_used: 262144 },
          unknown: { blob_count: 0, total_cost_wei: '0', blob_gas_used: 0 },
        },
      },
      {
        timestamp: '2026-01-01T00:01:00.000Z',
        values: {
          base: { blob_count: 5, total_cost_wei: '1500000000000000', blob_gas_used: 655360 },
          unknown: { blob_count: 2, total_cost_wei: '500000000000000', blob_gas_used: 262144 },
        },
      },
    ],
    summary: {
      total_blobs: 9,
      total_cost_wei: '3000000000000000',
      shares: [
        {
          key: 'base',
          name: 'Base',
          category: 'rollup',
          blob_count: 7,
          total_cost_wei: '2500000000000000',
          blob_share_percent: 77.78,
          spend_share_percent: 83.33,
        },
      ],
    },
  },
};

const mockCostComparison = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    range: '1h',
    granularity: 'minute',
    bucket_seconds: 60,
    start_time: '2026-01-01T00:00:00.000Z',
    end_time: '2026-01-01T01:00:00.000Z',
    generated_at: '2026-01-01T01:00:00.000Z',
    model: {
      calldata_gas_per_byte: 16,
      blob_size_bytes: 131072,
      description: 'test model',
    },
    points: [
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        blob_count: 2,
        blob_bytes: 262144,
        blob_cost_wei: '1000000000000000',
        calldata_equivalent_cost_wei: '100000000000000000',
        savings_wei: '99000000000000000',
        savings_percent: 99,
      },
      {
        timestamp: '2026-01-01T00:01:00.000Z',
        blob_count: 7,
        blob_bytes: 917504,
        blob_cost_wei: '2000000000000000',
        calldata_equivalent_cost_wei: '200000000000000000',
        savings_wei: '198000000000000000',
        savings_percent: 99,
      },
    ],
    summary: {
      blob_cost_wei: '3000000000000000',
      calldata_equivalent_cost_wei: '300000000000000000',
      savings_wei: '297000000000000000',
      savings_percent: 99,
    },
  },
};

const mockRollingStats = {
  success: true,
  data: {
    network_id: 1,
    network_name: 'mainnet',
    generated_at: '2026-01-01T01:00:00.000Z',
    windows: [
      {
        window: '5m',
        duration_seconds: 300,
        start_time: '2026-01-01T00:55:00.000Z',
        end_time: '2026-01-01T01:00:00.000Z',
        average_blob_base_fee_wei: '1000000000',
        median_blob_base_fee_wei: '1000000000',
        p95_blob_base_fee_wei: '2000000000',
        total_blobs: 5,
        total_blob_gas_used: 655360,
        average_utilization: '0.1',
        total_cost_wei: '1000000000000000',
        unique_senders: 3,
      },
      {
        window: '1h',
        duration_seconds: 3600,
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-01T01:00:00.000Z',
        average_blob_base_fee_wei: '1250000000',
        median_blob_base_fee_wei: '1000000000',
        p95_blob_base_fee_wei: '2000000000',
        total_blobs: 10,
        total_blob_gas_used: 1179648,
        average_utilization: '0.25',
        total_cost_wei: '10000000000000000',
        unique_senders: 5,
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
  marketResponse: typeof mockMarket = mockMarket,
  attributionResponse: typeof mockAttribution = mockAttribution,
  costComparisonResponse: typeof mockCostComparison = mockCostComparison,
  rollingStatsResponse: typeof mockRollingStats = mockRollingStats
) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/charts/blob-market')) {
      return Promise.resolve({
        ok: true,
        json: async () => marketResponse,
      });
    }
    if (url.includes('/charts/attribution-usage')) {
      return Promise.resolve({
        ok: true,
        json: async () => attributionResponse,
      });
    }
    if (url.includes('/charts/cost-comparison')) {
      return Promise.resolve({
        ok: true,
        json: async () => costComparisonResponse,
      });
    }
    if (url.includes('/charts/rolling-stats')) {
      return Promise.resolve({
        ok: true,
        json: async () => rollingStatsResponse,
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

  it('returns chartData from bucketed chart endpoints', async () => {
    const fetchMock = createFetchMock();

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));

    expect(result.current.chartData).not.toBeNull();
    expect(result.current.dataPoints).toBe(2);
    expect(result.current.timeRange).toBe('1h');
    expect(result.current.chartData!.baseFee.map((point) => point.baseFeeGwei)).toEqual([1, 2]);
    expect(result.current.chartData!.gasUtilization[0].targetGas).toBe(1835008);
    expect(result.current.chartData!.gasUtilization[0].maxGas).toBe(2752512);
    expect(result.current.chartData!.gasUtilization[1].maxGas).toBe(3145728);
    expect(result.current.chartData!.l2UsageSeries.map((series) => series.key)).toEqual(['base', 'unknown']);
    expect(result.current.chartData!.l2Usage[1].base).toBe(5);
    expect(result.current.chartData!.costComparison[0].savingsPct).toBe(99);
    expect(result.current.chartData!.rollingWindows).toHaveLength(2);
    expect(result.current.chartData!.selectedWindow?.totalBlobs).toBe(10);
    expect(result.current.chartData!.indicators.pendingBlobCount).toBe(5);
    expect(urls.some((url) => url.includes('/blob/pricing'))).toBe(false);
    expect(urls.some((url) => url.includes('/charts/blob-market?range=1h&granularity=auto'))).toBe(true);
    expect(urls.some((url) => url.includes('/charts/attribution-usage?range=1h&granularity=auto'))).toBe(true);
    expect(urls.some((url) => url.includes('/charts/cost-comparison?range=1h&granularity=auto'))).toBe(true);
    expect(urls.some((url) => url.includes('/charts/rolling-stats?windows=5m,1h,24h,7d,30d'))).toBe(true);
  });

  it('drops empty market buckets so missing data does not plot as zero', async () => {
    const fetchMock = createFetchMock({
      ...mockMarket,
      data: {
        ...mockMarket.data,
        points: [
          ...mockMarket.data.points,
          {
            timestamp: '2026-01-01T00:02:00.000Z',
            average_blob_base_fee_gwei: '0',
            median_blob_base_fee_gwei: '0',
            p95_blob_base_fee_gwei: '0',
            blob_count: 0,
            blob_gas_used: 0,
            blob_gas_target: 1835008,
            average_utilization: '0',
            total_cost_wei: '0',
            unique_senders: 0,
          },
        ],
      },
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chartData!.baseFee.map((point) => point.baseFeeGwei)).toEqual([1, 2]);
    expect(result.current.chartData!.gasUtilization).toHaveLength(2);
    expect(result.current.chartData!.indicators.recentBaseFeeSparkline).toEqual([1, 2]);
    expect(result.current.dataPoints).toBe(2);
    expect(result.current.chartData!.blockCoverageLabel).toContain('2 minute buckets');
  });

  it('captions each chart with the bucket count that chart actually plots', async () => {
    const fetchMock = createFetchMock(
      {
        ...mockMarket,
        data: {
          ...mockMarket.data,
          points: [
            ...mockMarket.data.points,
            {
              timestamp: '2026-01-01T00:02:00.000Z',
              average_blob_base_fee_gwei: '0',
              median_blob_base_fee_gwei: '0',
              p95_blob_base_fee_gwei: '0',
              blob_count: 0,
              blob_gas_used: 0,
              blob_gas_target: 1835008,
              average_utilization: '0',
              total_cost_wei: '0',
              unique_senders: 0,
            },
          ],
        },
      },
      {
        ...mockAttribution,
        data: {
          ...mockAttribution.data,
          points: [
            ...mockAttribution.data.points,
            {
              timestamp: '2026-01-01T00:02:00.000Z',
              values: {
                base: { blob_count: 1, total_cost_wei: '100000000000000', blob_gas_used: 131072 },
                unknown: { blob_count: 0, total_cost_wei: '0', blob_gas_used: 0 },
              },
            },
          ],
        },
      },
      {
        ...mockCostComparison,
        data: {
          ...mockCostComparison.data,
          points: mockCostComparison.data.points.slice(0, 1),
        },
      }
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const chartData = result.current.chartData!;

    // The market endpoint keeps 2 buckets after dropping the empty one, while
    // attribution returns 3 and cost comparison returns 1; each caption counts
    // the points its own chart plots.
    expect(chartData.baseFee).toHaveLength(2);
    expect(chartData.blockCoverageLabel).toBe('2 minute buckets over the 1h view');
    expect(chartData.l2Usage).toHaveLength(3);
    expect(chartData.l2UsageCoverageLabel).toBe('3 minute buckets over the 1h view');
    expect(chartData.costComparison).toHaveLength(1);
    expect(chartData.costComparisonCoverageLabel).toBe('1 minute bucket over the 1h view');
  });

  it('keeps chart summaries available when no market points are returned', async () => {
    const fetchMock = createFetchMock({
      ...mockMarket,
      data: {
        ...mockMarket.data,
        points: [],
      },
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useChartData(), { wrapper: createQueryWrapper(wrapper) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chartData).not.toBeNull();
    expect(result.current.chartData!.baseFee).toEqual([]);
    expect(result.current.chartData!.selectedWindow?.totalBlobs).toBe(10);
    expect(result.current.dataPoints).toBe(0);
  });

  it('reports error when a chart API fails', async () => {
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
