import { getMempool } from './mempool';

const originalFetch = global.fetch;

describe('api/mempool', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('maps mempool blobs to transaction rows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            tx_hash: '0xabc',
            from_address: '0x1234567890abcdef',
            user_attribution: 'Base',
            total_cost_eth: '1000000000',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getMempool(10, 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/mempool?limit=10&network=sepolia'),
      expect.any(Object)
    );
    expect(result.data[0]).toMatchObject({
      id: 1,
      txHash: '0xabc',
      fromAddress: '0x1234...',
      user: 'Base',
      blobCount: 1,
      timeInMempool: '5 min ago',
    });
    expect(result.data[0].estimatedCost).toContain('Gwei');
  });
});
