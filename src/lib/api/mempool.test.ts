import { getMempool } from './mempool';
import * as core from './core';

vi.mock('./core', async () => {
  const actual = await vi.importActual<typeof import('./core')>('./core');
  return {
    ...actual,
    fetchApi: vi.fn(),
    formatRelativeTime: vi.fn(() => '5 min ago'),
    truncateAddress: vi.fn(() => '0x1234...'),
  };
});

describe('api/mempool', () => {
  it('maps mempool blobs to transaction rows', async () => {
    vi.mocked(core.fetchApi).mockResolvedValue({
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
    } as any);

    const result = await getMempool(10, 'sepolia');

    expect(core.fetchApi).toHaveBeenCalledWith('/blob/mempool?limit=10', 'sepolia');
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
