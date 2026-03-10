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

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            block_number: 100,
            timestamp: '2026-01-01T00:00:00.000Z',
            user_attribution: 'Optimism',
          },
          {
            block_number: 100,
            timestamp: '2026-01-01T00:00:01.000Z',
            user_attribution: 'Optimism',
          },
          {
            block_number: 101,
            timestamp: '2026-01-01T00:00:02.000Z',
            user_attribution: undefined,
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(20, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=20&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      number: '100',
      blobCount: 2,
      timestamp: '1 min ago',
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
