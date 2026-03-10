import { getStats } from './stats';
import * as core from './core';

vi.mock('./core', () => ({
  fetchApi: vi.fn(),
}));

describe('api/stats', () => {
  it('maps stats response into frontend metric shape', async () => {
    vi.mocked(core.fetchApi).mockResolvedValue({
      success: true,
      data: {
        total_blobs: 100,
        total_confirmed_blobs: 80,
        total_pending_blobs: 20,
        average_base_fee: '1000000000',
        average_tip: '2000000000',
        average_total_cost: '3000000000',
        last_indexed_block: 12345,
        last_indexed_time: '2026-01-01T00:00:00.000Z',
      },
    } as any);

    const result = await getStats('mainnet');

    expect(core.fetchApi).toHaveBeenCalledWith('/stats', 'mainnet');
    expect(result.data).toMatchObject({
      totalBlobs: 100,
      totalConfirmedBlobs: 80,
      pendingBlobsCount: 20,
      avgBlobsPerBlock: 0.8,
      lastIndexedBlock: 12345,
    });
    expect(result.data.averageBaseFee).toContain('Gwei');
  });
});
