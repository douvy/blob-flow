const originalFetch = global.fetch;

describe('api/users', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps backend users to frontend shape with percentages', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
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
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getTopUsers(10, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users?limit=10&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data[0]).toMatchObject({
      id: 1,
      name: '0x1234...cdef',
      dataCount: 3,
      percentage: 75,
    });
    expect(result.data[1].name).toBe('Known User');
  });

  it('returns a user record by address', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          network_id: 1,
          network_name: 'mainnet',
          address: '0x1234567890abcdef',
          name: 'User A',
          blob_count: 5,
          total_cost_eth: '2.0',
          last_timestamp: '2026-01-01T00:00:00.000Z',
        },
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getUserByAddress('0x1234567890abcdef', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/0x1234567890abcdef?network=mainnet'),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      name: 'User A',
      blob_count: 5,
      total_cost_eth: '2.0',
    });
  });

  it('returns confirmed blobs for a user address', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ tx_hash: '0xabc', from_address: '0x123' }],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getUserBlobs('0x123', true, 20, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?from=0x123&limit=20&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tx_hash: '0xabc' });
  });

  it('returns mempool blobs for a user address', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ tx_hash: '0xdef', from_address: '0x123' }],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getUserBlobs('0x123', false, 10, 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/mempool?from=0x123&limit=10&network=sepolia'),
      expect.any(Object)
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tx_hash: '0xdef' });
  });
});
