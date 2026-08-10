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
            total_cost_wei: '1200000000000000000',
            total_cost_eth: '99',
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
      expect.stringContaining('/users?limit=10&range=all&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data[0]).toMatchObject({
      id: 1,
      name: '0x1234...cdef',
      dataCount: 3,
      percentage: 75,
      totalCostEth: '1.2',
      totalCostWei: '1200000000000000000',
    });
    expect(result.data[1].name).toBe('Known User');
  });

  it('requests the given time range', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await usersApi.getTopUsers(10, 'mainnet', '7d');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users?limit=10&range=7d&network=mainnet'),
      expect.any(Object)
    );
  });

  it('requests entity grouping and maps grouped row fields', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            address: '0xcF2898225ED05Be911D3709d9417e86E0b4Cfc8f',
            name: 'Scroll',
            key: 'scroll',
            addresses: [
              '0xcF2898225ED05Be911D3709d9417e86E0b4Cfc8f',
              '0x054a47B9E2a22aF6c0CE55020238C8FEcd7d334B',
            ],
            blob_count: 348008,
            total_cost_eth: '20.9',
            last_timestamp: '2026-08-09T00:00:00.000Z',
            blob_share_percent: 0.8,
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getTopUsers(50, 'mainnet', 'all', 'entity');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users?limit=50&range=all&group=entity&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data[0]).toMatchObject({
      name: 'Scroll',
      key: 'scroll',
      dataCount: 348008,
    });
    expect(result.data[0].addresses).toHaveLength(2);
  });

  it('uses server-computed blob shares when every row has one', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            address: '0x1234567890abcdef',
            name: 'Arbitrum',
            blob_count: 3,
            total_cost_eth: '1.2',
            last_timestamp: '2026-01-01T00:00:00.000Z',
            blob_share_percent: 12.34,
          },
          {
            address: '0xabcdef1234567890',
            name: 'Base',
            blob_count: 1,
            total_cost_eth: '0.3',
            last_timestamp: '2026-01-01T00:00:10.000Z',
            blob_share_percent: 3.75,
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getTopUsers(10, 'mainnet', '24h');

    // Server shares (of all users in the window), rounded to one decimal
    expect(result.data[0].percentage).toBe(12.3);
    expect(result.data[1].percentage).toBe(3.8);
  });

  it('falls back to local top-N shares for every row when any row lacks a server share', async () => {
    const usersApi = await import('./users');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            address: '0x1234567890abcdef',
            name: 'Arbitrum',
            blob_count: 3,
            total_cost_eth: '1.2',
            last_timestamp: '2026-01-01T00:00:00.000Z',
            blob_share_percent: 12.34,
          },
          {
            address: '0xabcdef1234567890',
            name: 'Base',
            blob_count: 1,
            total_cost_eth: '0.3',
            last_timestamp: '2026-01-01T00:00:10.000Z',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await usersApi.getTopUsers(10, 'mainnet', '24h');

    // Server and local shares have different denominators; mixing them in one
    // column would misstate shares, so all rows use the same local fallback.
    expect(result.data[0].percentage).toBe(75);
    expect(result.data[1].percentage).toBe(25);
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

  it('returns null when the address is not indexed on the network', async () => {
    const usersApi = await import('./users');
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(usersApi.getUserByAddress('0x1234567890abcdef', 'sepolia')).resolves.toBeNull();
  });

  it('rethrows non-404 user lookup failures', async () => {
    const usersApi = await import('./users');
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }) as unknown as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(usersApi.getUserByAddress('0x1234567890abcdef', 'sepolia')).rejects.toThrow(
      'API error: 400'
    );
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
