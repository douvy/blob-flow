import { getBlobByTxHash, getLatestBlocks } from './blocks';

const originalFetch = global.fetch;

describe('api/blocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('groups blobs by block and builds attribution list', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            blob_params: {
              max: 6,
            },
            recent_blocks: [
              {
                block_number: 100,
                block_timestamp: '2026-01-01T00:00:00.000Z',
                blob_count: 2,
                blob_gas_used: 262144,
                blob_gas_target: 393216,
                blob_gas_limit: 786432,
                target_blobs: 3,
                max_blobs: 6,
                available_blobs: 4,
                blob_base_fee_gwei: '0.25',
                utilization_percent: 33.33,
                is_full: false,
                is_above_target: false,
              },
              {
                block_number: 101,
                block_timestamp: '2026-01-01T00:00:02.000Z',
                blob_count: 0,
                blob_gas_used: 0,
                blob_gas_target: 393216,
                blob_gas_limit: 786432,
                target_blobs: 3,
                max_blobs: 6,
                available_blobs: 6,
                blob_base_fee_gwei: '0.2',
                utilization_percent: 0,
                is_full: false,
                is_above_target: false,
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              block_number: 100,
              timestamp: '2026-01-01T00:00:00.000Z',
              user_attribution: 'Optimism',
              block_url: 'https://etherscan.io/block/100',
            },
            {
              block_number: 100,
              timestamp: '2026-01-01T00:00:01.000Z',
              user_attribution: 'Optimism',
            },
          ],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(20, 'mainnet');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/blob/pricing?network=mainnet'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/blob/latest?limit=120&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      number: '100',
      blobCount: 2,
      timestamp: '1 min ago',
      blockUrl: 'https://etherscan.io/block/100',
      baseFeeGwei: '0.25',
      utilizationPercent: 33.33,
      availableBlobs: 4,
      maxBlobs: 6,
      attribution: ['Optimism'],
    });
    expect(result.data[1].attribution).toEqual(['Unknown']);
  });

  it('fetches a blob by transaction hash', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { tx_hash: '0xabc' } }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBlobByTxHash('0xabc', 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/0xabc?network=sepolia'),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
  });
});
