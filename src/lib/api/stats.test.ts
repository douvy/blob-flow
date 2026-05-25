import { getStats, transformStatsResponse } from './stats';

const originalFetch = global.fetch;

describe('api/stats', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps stats response into frontend metric shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          total_blobs: 100,
          total_confirmed_blobs: 80,
          total_pending_blobs: 20,
          average_base_fee: '1000000000',
          average_tip: '2000000000',
          average_total_cost: '500000000000000',
          last_indexed_block: 12345,
          last_indexed_time: '2026-01-01T00:00:00.000Z',
        },
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getStats('mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stats?network=mainnet'),
      expect.any(Object)
    );
    expect(result.data).toMatchObject({
      totalBlobs: 100,
      totalConfirmedBlobs: 80,
      pendingBlobsCount: 20,
      avgBlobsPerBlock: 0.8,
      lastIndexedBlock: 12345,
    });
    expect(result.data.averageBaseFee).toContain('Gwei');
    expect(result.data.averageTotalCost).toBe('0.0005 ETH');
  });

  it('formats websocket fractional wei average total cost as ETH', () => {
    const result = transformStatsResponse({
      total_blobs: 100,
      total_confirmed_blobs: 80,
      total_pending_blobs: 20,
      average_base_fee: '5014755072.74762611',
      average_tip: '2000000000',
      average_total_cost: '2203603226459001.927',
      last_indexed_block: 12345,
      last_indexed_time: '2026-01-01T00:00:00.000Z',
    });

    expect(result.data.averageBaseFee).toContain('Gwei');
    expect(result.data.averageTotalCost).toBe('0.002203603226459001927 ETH');
  });
});
