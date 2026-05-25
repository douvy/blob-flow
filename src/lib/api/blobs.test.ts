import { getBlobPricing, getRawBlobs } from './blobs';

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

  it('fetches blob pricing with recent block utilization', async () => {
    const mockPricing = {
      network_id: 1,
      network_name: 'mainnet',
      current_base_fee: '1000000000',
      current_base_fee_gwei: '1',
      current_excess_gas: 0,
      current_utilization: '0.5',
      predicted_next_fee: '900000000',
      predicted_next_fee_gwei: '0.9',
      fork_stage: 'BPO2',
      blob_params: {
        target: 14,
        max: 21,
        update_fraction: 11684671,
        target_gas: 1835008,
        max_gas: 2752512,
      },
      market_pressure: {
        recent_blocks_above_target: 1,
        consecutive_full_blocks: 0,
        percent_recent_blocks_at_max_blobs: 0,
        predicted_direction: 'down',
        next_block_fee_estimate: {
          low: '800000000',
          high: '1000000000',
        },
      },
      recent_blocks: [
        {
          block_number: 123,
          block_timestamp: '2026-01-01T12:00:00.000Z',
          blob_count: 10,
          blob_gas_used: 1310720,
          blob_gas_target: 1835008,
          blob_gas_limit: 2752512,
          excess_blob_gas: 0,
          blob_base_fee: '1000000000',
          blob_base_fee_gwei: '1',
          utilization_ratio: '0.714286',
          blob_params_target: 14,
          blob_params_max: 21,
          target_blobs: 14,
          max_blobs: 21,
          available_blobs: 11,
          utilization_percent: 47.62,
          is_full: false,
          is_above_target: false,
          update_fraction: 11684671,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockPricing }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBlobPricing(12, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/pricing?blocks=12&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toEqual(mockPricing);
    expect(result.blob_params.target_gas).toBe(1835008);
  });
});
