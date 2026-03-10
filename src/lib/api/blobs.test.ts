import { getRawBlobs } from './blobs';

const originalFetch = global.fetch;

describe('api/blobs', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches raw blobs with default limit and returns data array', async () => {
    const mockBlobs = [
      {
        network_id: 1,
        network_name: 'sepolia',
        block_number: 100,
        blob_index: 0,
        tx_hash: '0xabc',
        from_address: '0x123',
        blob_size_bytes: 131072,
        base_fee_per_blob_gas: '1000000000',
        tip_per_blob_gas: '100000000',
        total_cost_eth: '500000000000000',
        timestamp: '2026-01-01T12:00:00.000Z',
        confirmed: true,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBlobs }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRawBlobs(200, 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=200&network=sepolia'),
      expect.any(Object)
    );
    expect(result).toEqual(mockBlobs);
    expect(result).toHaveLength(1);
    expect(result[0].block_number).toBe(100);
  });

  it('fetches with custom limit and no network', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getRawBlobs(500);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=500'),
      expect.any(Object)
    );
    expect(result).toEqual([]);
  });

  it('uses default limit of 200 when no limit specified', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await getRawBlobs();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/latest?limit=200'),
      expect.any(Object)
    );
  });
});
