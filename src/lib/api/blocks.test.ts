import {
  getBlobByTxHash,
  getBlobByVersionedHash,
  getBlockByNumber,
  getLatestBlocks,
  transformNewBlockData,
} from './blocks';

const originalFetch = global.fetch;

function makePricingBlock(blockNumber: number, blobCount = 1) {
  return {
    block_number: blockNumber,
    block_timestamp: '2026-01-01T00:00:00.000Z',
    blob_count: blobCount,
    blob_gas_used: 131072,
    blob_gas_target: 393216,
    blob_gas_limit: 786432,
    blob_base_fee_gwei: '0.25',
    target_blobs: 3,
    max_blobs: 6,
    available_blobs: 5,
    utilization_percent: 16.67,
    is_full: false,
    is_above_target: false,
  };
}

function makeBlob(blockNumber: number, txHash: string, attribution = 'Base') {
  return {
    block_number: blockNumber,
    blob_index: 0,
    tx_hash: txHash,
    timestamp: '2026-01-01T00:00:00.000Z',
    user_attribution: attribution,
  };
}

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

function makePricingResponse(recentBlocks: unknown[], max = 6) {
  return jsonResponse({
    blob_params: {
      target: 3,
      max,
      update_fraction: 3338477,
      target_gas: 393216,
      max_gas: 786432,
    },
    recent_blocks: recentBlocks,
  });
}

describe('api/blocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('groups blobs by block and builds attribution list', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            blob_params: {
              target: 3,
              max: 6,
              update_fraction: 3338477,
              target_gas: 393216,
              max_gas: 786432,
            },
            recent_blocks: [
              {
                block_number: 100,
                block_timestamp: '2026-01-01T00:00:00.000Z',
                blob_count: 2,
                blob_gas_used: 262144,
                blob_gas_target: 393216,
                blob_gas_limit: 786432,
                excess_blob_gas: 0,
                blob_base_fee: '250000000',
                blob_base_fee_gwei: '0.25',
                utilization_ratio: '0.3333',
                blob_params_target: 3,
                blob_params_max: 6,
                target_blobs: 3,
                max_blobs: 6,
                available_blobs: 4,
                utilization_percent: 33.33,
                is_full: false,
                is_above_target: false,
                update_fraction: 3338477,
              },
              {
                block_number: 101,
                block_timestamp: '2026-01-01T00:00:02.000Z',
                blob_count: 0,
                blob_gas_used: 0,
                blob_gas_target: 393216,
                blob_gas_limit: 786432,
                excess_blob_gas: 0,
                blob_base_fee: '200000000',
                blob_base_fee_gwei: '0.2',
                utilization_ratio: '0',
                blob_params_target: 3,
                blob_params_max: 6,
                target_blobs: 3,
                max_blobs: 6,
                available_blobs: 6,
                utilization_percent: 0,
                is_full: false,
                is_above_target: false,
                update_fraction: 3338477,
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              block_number: 100,
              timestamp: '2026-01-01T00:00:00.000Z',
              user_attribution: 'Optimism',
              block_url: 'https://etherscan.io/block/100',
              tx_hash: '0xabc',
            },
            {
              block_number: 100,
              timestamp: '2026-01-01T00:00:01.000Z',
              user_attribution: 'Optimism',
              tx_hash: '0xdef',
            },
          ],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(20, 'mainnet');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/blob/pricing?blocks=20&network=mainnet'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/blob/latest?limit=100&offset=0&network=mainnet'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      number: '100',
      blobCount: 2,
      timestamp: '2026-01-01T00:00:00.000Z',
      blockUrl: 'https://etherscan.io/block/100',
      baseFeeGwei: '0.25',
      utilizationPercent: 33.33,
      availableBlobs: 4,
      maxBlobs: 6,
      attribution: ['Optimism'],
    });
    expect(result.data[0].blobs.map((blob) => blob.tx_hash)).toEqual(['0xabc', '0xdef']);
    expect(result.data[1].attribution).toEqual([]);
  });

  it('pages the blob feed until the pricing block window is covered', async () => {
    const pricingBlocks = [300, 299, 298].map((n) => makePricingBlock(n));
    // Page 0 is full but never reaches below block 300; page 1 is also full
    // and passes the oldest pricing block, which must end the paging even
    // though the page bound (4 for limit 40) allows more requests.
    const pageZero = Array.from({ length: 100 }, (_, i) => makeBlob(300, `0xaa${i}`));
    const pageOne = [
      makeBlob(299, '0xb1', 'Optimism'),
      makeBlob(298, '0xb2', 'Arbitrum'),
      ...Array.from({ length: 98 }, (_, i) => makeBlob(297, `0xcc${i}`)),
    ];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePricingResponse(pricingBlocks))
      .mockResolvedValueOnce(jsonResponse(pageZero))
      .mockResolvedValueOnce(jsonResponse(pageOne));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(40, 'mainnet');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/blob/latest?limit=100&offset=0&network=mainnet'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/blob/latest?limit=100&offset=100&network=mainnet'),
      expect.any(Object)
    );
    expect(result.data).toHaveLength(3);
    expect(result.data[0].attribution).toEqual(['Base']);
    expect(result.data[1].attribution).toEqual(['Optimism']);
    expect(result.data[2].attribution).toEqual(['Arbitrum']);
  });

  it('keeps a blob returned by two overlapping pages once', async () => {
    const pricingBlocks = [200, 199].map((n) => makePricingBlock(n));
    // New blobs arriving between page requests shift rows to higher offsets,
    // so the last row of page 0 repeats at the start of page 1.
    const overlap = makeBlob(200, '0xdup');
    const pageZero = [
      ...Array.from({ length: 99 }, (_, i) => makeBlob(201, `0xaa${i}`)),
      overlap,
    ];
    const pageOne = [overlap, makeBlob(199, '0xb2', 'Optimism')];

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePricingResponse(pricingBlocks))
      .mockResolvedValueOnce(jsonResponse(pageZero))
      .mockResolvedValueOnce(jsonResponse(pageOne));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(20, 'mainnet');

    expect(result.data[0].blobs.map((blob) => blob.tx_hash)).toEqual(['0xdup']);
    expect(result.data[1].blobs.map((blob) => blob.tx_hash)).toEqual(['0xb2']);
  });

  it('stops paging at the window bound when the feed keeps returning newer blobs', async () => {
    const pricingBlocks = [makePricingBlock(500)];
    const fullPage = (page: number) =>
      Array.from({ length: 100 }, (_, i) => makeBlob(1000, `0x${page}-${i}`));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makePricingResponse(pricingBlocks))
      .mockResolvedValueOnce(jsonResponse(fullPage(0)))
      .mockResolvedValueOnce(jsonResponse(fullPage(1)));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(1, 'mainnet');

    // limit 1 with max 6 bounds paging to ceil(6 / 100) + 1 = 2 pages.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.data[0].attribution).toEqual(['Unknown']);
  });

  it('skips the blob feed when pricing returns no blocks', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makePricingResponse([]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getLatestBlocks(20, 'mainnet');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([]);
  });

  it('fetches a blob by transaction hash', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { tx_hash: '0xabc' } }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBlobByTxHash('0xabc', 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/0xabc?network=sepolia'),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
  });

  it('fetches a block by number from the dedicated endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          block_number: 25467750,
          blob_count: 1,
          timestamp: '2026-01-01T00:00:00.000Z',
          blobs: [
            {
              block_number: 25467750,
              timestamp: '2026-01-01T00:00:00.000Z',
              tx_hash: '0xabc',
              user_attribution: 'Base',
            },
          ],
          pricing: {
            block_number: 25467750,
            block_timestamp: '2026-01-01T00:00:00.000Z',
            blob_count: 1,
            blob_gas_used: 131072,
            blob_gas_target: 393216,
            blob_gas_limit: 786432,
            blob_base_fee_gwei: '0.25',
            target_blobs: 3,
            max_blobs: 6,
            available_blobs: 5,
            utilization_percent: 16.67,
            is_full: false,
            is_above_target: false,
          },
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const block = await getBlockByNumber(25467750, 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/block/25467750?network=mainnet'),
      expect.any(Object)
    );
    expect(block).toMatchObject({
      number: '25467750',
      blobCount: 1,
      maxBlobs: 6,
      availableBlobs: 5,
      baseFeeGwei: '0.25',
      attribution: ['Base'],
    });
  });

  it('returns null when the block is not indexed', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBlockByNumber(1, 'mainnet')).resolves.toBeNull();
  });

  it('rethrows non-404 block lookup failures', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }) as unknown as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBlockByNumber(1, 'mainnet')).rejects.toThrow('API error: 400');
  });

  it('fetches a blob by versioned hash', async () => {
    const versionedHash = `0x01${'ab'.repeat(31)}`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { tx_hash: '0xabc', block_number: 100, versioned_hash: versionedHash },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const blob = await getBlobByVersionedHash(versionedHash, 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/blob/by-hash/${versionedHash}?network=sepolia`),
      expect.any(Object)
    );
    expect(blob).toMatchObject({ tx_hash: '0xabc', block_number: 100 });
  });

  it('returns null when no blob carries the versioned hash', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBlobByVersionedHash(`0x01${'ab'.repeat(31)}`)).resolves.toBeNull();
  });

  it('does not infer capacity for live blocks without pricing data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));

    const block = transformNewBlockData({
      block_number: 102,
      blob_count: 2,
      timestamp: '2026-01-01T00:00:30.000Z',
      blobs: [
        {
          network_id: 1,
          network_name: 'mainnet',
          block_number: 102,
          blob_index: 0,
          tx_hash: '0xabc',
          from_address: '0x1234567890abcdef',
          blob_size_bytes: 131072,
          base_fee_per_blob_gas: '1000000000',
          base_fee_per_blob_gas_gwei: '1',
          tip_per_blob_gas: '0',
          total_cost_eth: '0.001',
          timestamp: '2026-01-01T00:00:30.000Z',
          confirmed: true,
          user_attribution: 'Base',
        },
      ],
    });

    expect(block).toMatchObject({
      blobCount: 2,
      maxBlobs: 0,
      availableBlobs: 0,
      utilizationPercent: 0,
      isFull: false,
      isAboveTarget: false,
      attribution: ['Base'],
      baseFeeGwei: '1',
    });
  });

  it('uses websocket block pricing when present on live block data', () => {
    const block = transformNewBlockData({
      block_number: 103,
      blob_count: 2,
      timestamp: '2026-01-01T00:00:30.000Z',
      blobs: [],
      pricing: {
        block_number: 103,
        block_timestamp: '2026-01-01T00:00:30.000Z',
        blob_count: 2,
        blob_gas_used: 262144,
        blob_gas_target: 393216,
        blob_gas_limit: 786432,
        excess_blob_gas: 0,
        blob_base_fee: '250000000',
        blob_base_fee_gwei: '0.25',
        utilization_ratio: '0.3333',
        blob_params_target: 3,
        blob_params_max: 6,
        target_blobs: 3,
        max_blobs: 6,
        available_blobs: 4,
        utilization_percent: 33.33,
        is_full: false,
        is_above_target: false,
        update_fraction: 3338477,
      },
    });

    expect(block).toMatchObject({
      blobCount: 2,
      blobGasUsed: 262144,
      blobGasTarget: 393216,
      maxBlobs: 6,
      targetBlobs: 3,
      availableBlobs: 4,
      utilizationPercent: 33.33,
      baseFeeGwei: '0.25',
      attribution: ['Unknown'],
    });
  });
});
