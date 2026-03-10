import { getChartData } from './charts';

const originalFetch = global.fetch;

describe('api/charts', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns empty chart arrays when no blobs are returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getChartData('mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=200&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toEqual({ baseFeeData: [], costData: [] });
  });

  it('groups blobs per block and computes averaged base fee/cost in chronological order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            block_number: 2,
            timestamp: '2026-01-01T13:02:00.000Z',
            base_fee_per_blob_gas: '2000000000',
            total_cost_eth: '0.2',
          },
          {
            block_number: 1,
            timestamp: '2026-01-01T13:01:00.000Z',
            base_fee_per_blob_gas: '1000000000',
            total_cost_eth: '0.1',
          },
          {
            block_number: 2,
            timestamp: '2026-01-01T13:02:00.000Z',
            base_fee_per_blob_gas: '4000000000',
            total_cost_eth: '0.4',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getChartData('sepolia');

    expect(result.baseFeeData).toEqual([
      { time: '13:01', baseFee: 1 },
      { time: '13:02', baseFee: 3 },
    ]);

    expect(result.costData).toEqual([
      { time: '13:01', blobCost: 0.1 },
      { time: '13:02', blobCost: 0.3 },
    ]);
  });

  it('skips invalid base fee and cost values', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            block_number: 10,
            timestamp: '2026-01-01T13:10:00.000Z',
            base_fee_per_blob_gas: 'invalid',
            total_cost_eth: 'NaN',
          },
          {
            block_number: 11,
            timestamp: '2026-01-01T13:11:00.000Z',
            base_fee_per_blob_gas: '',
            total_cost_eth: '',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getChartData();

    expect(result.baseFeeData).toEqual([]);
    expect(result.costData).toEqual([]);
  });
});
