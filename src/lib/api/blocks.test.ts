import { getBlobByTxHash, getLatestBlocks } from './blocks';
import * as core from './core';

vi.mock('./core', async () => {
  const actual = await vi.importActual<typeof import('./core')>('./core');
  return {
    ...actual,
    fetchApi: vi.fn(),
    formatRelativeTime: vi.fn(() => '1 min ago'),
  };
});

describe('api/blocks', () => {
  it('groups blobs by block and builds attribution list', async () => {
    vi.mocked(core.fetchApi).mockResolvedValue({
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
    } as any);

    const result = await getLatestBlocks(20, 'mainnet');

    expect(core.fetchApi).toHaveBeenCalledWith('/blob/latest?limit=20', 'mainnet');
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
    vi.mocked(core.fetchApi).mockResolvedValue({ success: true, data: { tx_hash: '0xabc' } } as any);

    const result = await getBlobByTxHash('0xabc', 'sepolia');

    expect(core.fetchApi).toHaveBeenCalledWith('/blob/0xabc', 'sepolia');
    expect(result.success).toBe(true);
  });
});
