const originalFetch = global.fetch;

const ADDRESS_A = '0xcF2898225ED05Be911D3709d9417e86E0b4Cfc8f';
const ADDRESS_B = '0x054a47B9E2a22aF6c0CE55020238C8FEcd7d334B';

const scrollPayload = {
  chain_id: 1,
  network_name: 'mainnet',
  key: 'scroll',
  name: 'Scroll',
  category: 'rollup',
  range: 'all',
  blob_count: 348008,
  total_cost_wei: '20901160000000000000',
  total_cost_eth: '20.90116',
  last_timestamp: '2026-08-09T00:00:00.000Z',
  blob_share_percent: 0.8123,
  spend_share_percent: 0.71,
  addresses: [
    {
      address: ADDRESS_A,
      blob_count: 180213,
      total_cost_wei: '10927065000000000000',
      total_cost_eth: '10.927065',
      last_timestamp: '2024-12-25T00:00:00.000Z',
      in_registry: false,
    },
    {
      address: ADDRESS_B,
      blob_count: 167795,
      total_cost_wei: '9974095000000000000',
      total_cost_eth: '9.974095',
      last_timestamp: '2026-08-09T00:00:00.000Z',
      in_registry: true,
    },
    {
      address: '0xdddddddddddddddddddddddddddddddddddddddd',
      blob_count: 0,
      total_cost_wei: '0',
      total_cost_eth: '0',
      in_registry: true,
    },
  ],
};

describe('api/entities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the entity by slug and maps the breakdown', async () => {
    const entitiesApi = await import('./entities');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: scrollPayload }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const entity = await entitiesApi.getEntityBySlug('scroll', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/entities/scroll?network=mainnet'),
      expect.any(Object)
    );
    expect(entity).toMatchObject({
      key: 'scroll',
      slug: 'scroll',
      name: 'Scroll',
      category: 'rollup',
      totalDataCount: 348008,
      totalCostWei: '20901160000000000000',
      lastTimestamp: '2026-08-09T00:00:00.000Z',
      blobSharePercent: 0.8123,
    });
    expect(entity?.addresses.map((a) => a.address)).toEqual([
      ADDRESS_A,
      ADDRESS_B,
      '0xdddddddddddddddddddddddddddddddddddddddd',
    ]);
    // The retired sender is flagged, and a zero-activity registry address
    // arrives with a null last-active rather than a fake timestamp.
    expect(entity?.addresses[0].inRegistry).toBe(false);
    expect(entity?.addresses[2].lastTimestamp).toBeNull();
  });

  it('normalizes the requested slug before hitting the endpoint', async () => {
    const entitiesApi = await import('./entities');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: scrollPayload }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await entitiesApi.getEntityBySlug('Robinhood Chain!', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/entities/robinhood-chain?network=mainnet'),
      expect.any(Object)
    );
  });

  it('converts an underscore backend key into the hyphen page slug', async () => {
    const entitiesApi = await import('./entities');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...scrollPayload, key: 'robinhood_chain', name: 'Robinhood Chain' },
      }),
    }) as unknown as typeof fetch;

    const entity = await entitiesApi.getEntityBySlug('robinhood-chain');

    expect(entity?.key).toBe('robinhood_chain');
    expect(entity?.slug).toBe('robinhood-chain');
  });

  it('returns null for an unknown entity', async () => {
    const entitiesApi = await import('./entities');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'not found' }),
    }) as unknown as typeof fetch;

    expect(await entitiesApi.getEntityBySlug('nope', 'mainnet')).toBeNull();
  });

  it('returns null for input that cannot make a slug, without fetching', async () => {
    const entitiesApi = await import('./entities');
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await entitiesApi.getEntityBySlug('???')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('api/entities getEntityBlobs', () => {
  const blob = (from: string, timestamp: string, txHash: string, blobIndex = 0) => ({
    tx_hash: txHash,
    blob_index: blobIndex,
    from_address: from,
    timestamp,
    block_number: 100,
  });

  // Answers each per-address blob request with that address's fixture list.
  const mockBlobFetch = (byAddress: Record<string, unknown[]>) => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const from = new URL(url).searchParams.get('from') ?? '';
      return {
        ok: true,
        json: async () => ({ success: true, data: byAddress[from] ?? [] }),
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('merges per-address lists newest first and applies the limit', async () => {
    const entitiesApi = await import('./entities');
    mockBlobFetch({
      [ADDRESS_A]: [
        blob(ADDRESS_A, '2026-08-10T00:00:03.000Z', '0xa1'),
        blob(ADDRESS_A, '2026-08-10T00:00:01.000Z', '0xa2'),
      ],
      [ADDRESS_B]: [
        blob(ADDRESS_B, '2026-08-10T00:00:04.000Z', '0xb1'),
        blob(ADDRESS_B, '2026-08-10T00:00:02.000Z', '0xb2'),
      ],
    });

    const merged = await entitiesApi.getEntityBlobs([ADDRESS_A, ADDRESS_B], true, 3, 'mainnet');

    expect(merged.map((b) => b.tx_hash)).toEqual(['0xb1', '0xa1', '0xb2']);
  });

  it('requests each address once, against the endpoint matching confirmed', async () => {
    const entitiesApi = await import('./entities');
    const fetchMock = mockBlobFetch({});

    await entitiesApi.getEntityBlobs([ADDRESS_A, ADDRESS_A, ADDRESS_B], false, 5, 'mainnet');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/blob/mempool?from=${ADDRESS_A}&limit=5`),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/blob/mempool?from=${ADDRESS_B}&limit=5`),
      expect.any(Object)
    );
  });

  it('returns an empty list for no addresses without fetching', async () => {
    const entitiesApi = await import('./entities');
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(await entitiesApi.getEntityBlobs([], true, 10, 'mainnet')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
