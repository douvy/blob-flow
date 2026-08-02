import { getRawBlobs } from './blobs';

const originalFetch = global.fetch;

function makeBlob(id: number) {
  return {
    network_id: 1,
    network_name: 'sepolia',
    block_number: 100000 - Math.floor(id / 6),
    blob_index: id % 6,
    tx_hash: `0xtx${Math.floor(id / 6)}`,
    from_address: '0x123',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1000000000',
    tip_per_blob_gas: '100000000',
    total_cost_eth: '500000000000000',
    timestamp: '2026-01-01T12:00:00.000Z',
    confirmed: true,
  };
}

function makeBlobs(count: number, startId = 0) {
  return Array.from({ length: count }, (_, i) => makeBlob(startId + i));
}

function mockFetchPages(...pages: unknown[][]) {
  const fetchMock = vi.fn();
  for (const page of pages) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: page }),
    });
  }
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function dedupeKeys(blobs: Array<{ tx_hash: string; blob_index: number }>) {
  return new Set(blobs.map((blob) => `${blob.tx_hash}:${blob.blob_index}`));
}

describe('api/blobs', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('pages the feed in 100 row requests until the limit is collected', async () => {
    const fetchMock = mockFetchPages(makeBlobs(100, 0), makeBlobs(100, 100));

    const result = await getRawBlobs(200, 'sepolia');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/blob/latest?limit=100&offset=0&network=sepolia'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/blob/latest?limit=100&offset=100&network=sepolia'),
      expect.any(Object)
    );
    expect(result).toHaveLength(200);
    expect(result[0].tx_hash).toBe('0xtx0');
  });

  it('returns a short feed unchanged from a single request', async () => {
    const mockBlobs = makeBlobs(1);
    const fetchMock = mockFetchPages(mockBlobs);

    const result = await getRawBlobs(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=100&offset=0'),
      expect.any(Object)
    );
    expect(result).toEqual(mockBlobs);
  });

  it('stops paging when the feed runs dry before the limit', async () => {
    const fetchMock = mockFetchPages(
      makeBlobs(100, 0),
      makeBlobs(100, 100),
      makeBlobs(40, 200)
    );

    const result = await getRawBlobs(500);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(240);
  });

  it('dedupes rows that overlap across pages and trims to the limit', async () => {
    // New blobs arriving between requests shift rows to higher offsets, so
    // page two repeats the tail of page one.
    const fetchMock = mockFetchPages(
      makeBlobs(100, 0),
      makeBlobs(100, 50),
      makeBlobs(100, 150)
    );

    const result = await getRawBlobs(200);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(200);
    expect(dedupeKeys(result).size).toBe(200);
  });

  it('stops at the page cap when overlap keeps every page full', async () => {
    const samePage = makeBlobs(100);
    const fetchMock = mockFetchPages(samePage, samePage, samePage, samePage);

    const result = await getRawBlobs(200);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(100);
  });

  it('uses default limit of 200 when no limit specified', async () => {
    const fetchMock = mockFetchPages(makeBlobs(100, 0), makeBlobs(100, 100));

    const result = await getRawBlobs();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(200);
  });
});
