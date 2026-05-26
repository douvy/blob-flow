import { getBlobByTxHash, getLatestBlocks, transformNewBlockData } from './blocks';

const originalFetch = global.fetch;

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
      expect.stringContaining('/blob/latest?limit=120&network=mainnet'),
      expect.any(Object)
    );
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
    expect(result.data[1].attribution).toEqual(['Unknown']);
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
    });
  });
});
