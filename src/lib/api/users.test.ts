import { getTopUsers, getUserById } from './users';
import * as core from './core';

describe('api/users', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps backend users to frontend shape with percentages', async () => {
    vi.spyOn(core, 'fetchApi').mockResolvedValue({
      success: true,
      data: [
        {
          address: '0x1234567890abcdef',
          name: '',
          blob_count: 3,
          total_cost_eth: '1.2',
          last_timestamp: '2026-01-01T00:00:00.000Z',
        },
        {
          address: '0xabcdef1234567890',
          name: 'Known User',
          blob_count: 1,
          total_cost_eth: '0.3',
          last_timestamp: '2026-01-01T00:00:10.000Z',
        },
      ],
    } as any);

    const result = await getTopUsers(10, 'mainnet');

    expect(core.fetchApi).toHaveBeenCalledWith('/users?limit=10', 'mainnet');
    expect(result.data[0]).toMatchObject({
      id: 1,
      name: '0x1234...cdef',
      dataCount: 3,
      percentage: 75,
    });
    expect(result.data[1].name).toBe('Known User');
  });

  it('returns user detail for valid user id', async () => {
    vi.spyOn(core, 'fetchApi').mockResolvedValue({
      success: true,
      data: [
        {
          address: '0x1234567890abcdef',
          name: 'User A',
          blob_count: 5,
          total_cost_eth: '2.0',
          last_timestamp: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as any);

    const result = await getUserById(1, 'mainnet');

    expect(result.data).toMatchObject({
      id: 1,
      name: 'User A',
      totalCost: '2.0',
      avgCostPerBlob: '0 ETH',
      firstSeen: 'Unknown',
    });
  });

  it('throws if user id is not found', async () => {
    vi.spyOn(core, 'fetchApi').mockResolvedValue({ success: true, data: [] } as any);

    await expect(getUserById(99, 'mainnet')).rejects.toThrow('User with ID 99 not found');
  });
});
