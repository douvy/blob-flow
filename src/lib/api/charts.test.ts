import {
  getAttributionUsageChart,
  getBlobMarketChart,
  getCostComparisonChart,
  getRollingStatsChart,
} from './charts';

const originalFetch = global.fetch;

describe('api/charts', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches blob market chart data with range and granularity params', async () => {
    const mockData = {
      network_id: 1,
      network_name: 'mainnet',
      range: '24h',
      granularity: 'minute',
      bucket_seconds: 300,
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-02T00:00:00.000Z',
      generated_at: '2026-01-02T00:00:00.000Z',
      points: [],
      summary: {
        current_base_fee_gwei: '1',
        average_blob_base_fee_gwei: '1',
        median_blob_base_fee_gwei: '1',
        p95_blob_base_fee_gwei: '1',
        total_blobs: 0,
        total_blob_gas_used: 0,
        average_utilization: '0',
        total_cost_wei: '0',
        unique_senders: 0,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBlobMarketChart('24h', 'mainnet', 'hour', 100);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/blob-market?range=24h&granularity=hour&limit=100&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toBe(mockData);
  });

  it('fetches attribution usage chart data', async () => {
    const mockData = {
      network_id: 1,
      network_name: 'mainnet',
      range: '7d',
      granularity: 'hour',
      bucket_seconds: 3600,
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-08T00:00:00.000Z',
      generated_at: '2026-01-08T00:00:00.000Z',
      series: [],
      points: [],
      summary: {
        total_blobs: 0,
        total_cost_wei: '0',
        shares: [],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getAttributionUsageChart('7d');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/attribution-usage?range=7d&granularity=auto'),
      expect.any(Object)
    );
    expect(result).toBe(mockData);
  });

  it('fetches cost comparison chart data', async () => {
    const mockData = {
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
        description: 'test',
      },
      points: [],
      summary: {
        blob_cost_wei: '0',
        calldata_equivalent_cost_wei: '0',
        savings_wei: '0',
        savings_percent: 0,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getCostComparisonChart('1h', 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/cost-comparison?range=1h&granularity=auto&network=sepolia'),
      expect.any(Object)
    );
    expect(result).toBe(mockData);
  });

  it('fetches rolling stats from the charts namespace', async () => {
    const mockData = {
      network_id: 1,
      network_name: 'mainnet',
      generated_at: '2026-01-01T00:00:00.000Z',
      windows: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRollingStatsChart(['1h', '24h'], 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/rolling-stats?windows=1h,24h&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toBe(mockData);
  });
});
