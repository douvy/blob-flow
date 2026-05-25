import { getMempool, getMempoolPressure, transformBlobToMempoolTransaction } from './mempool';

const originalFetch = global.fetch;

describe('api/mempool', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('maps mempool blobs to transaction rows', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            tx_hash: '0xabc',
            from_address: '0x1234567890abcdef',
            user_attribution: 'Base',
            total_cost_eth: '1000000000',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getMempool(10, 'sepolia');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/mempool?limit=10&network=sepolia'),
      expect.any(Object)
    );
    expect(result.data[0]).toMatchObject({
      id: 1,
      txHash: '0xabc',
      fromAddress: '0x1234...',
      user: 'Base',
      blobCount: 1,
      timeInMempool: '5 min ago',
      rawBlob: expect.objectContaining({
        tx_hash: '0xabc',
        from_address: '0x1234567890abcdef',
      }),
    });
    expect(result.data[0].estimatedCost).toContain('Gwei');
  });

  it('maps mempool pressure into includability and compact fee data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          network_id: 1,
          network_name: 'mainnet',
          pending_blob_count: 4,
          pending_blob_gas: 524288,
          pending_unique_senders: 3,
          max_fee_per_blob_gas: {
            min: '8794420',
            avg: '504839295.75000000',
            median: '10562763',
            p95: '1000000000',
            max: '2000000000',
          },
          pending_tx_age: {
            oldest_age_seconds: 695.7,
            newest_age_seconds: 20.7,
            average_age_seconds: 314.03,
            oldest_timestamp: '2026-01-01T00:00:00Z',
            newest_timestamp: '2026-01-01T00:10:00Z',
          },
          includability: {
            latest_blob_base_fee: '9389122',
            pricing_available: true,
            likely_includable_count: 3,
            underpriced_count: 1,
            unknown_pricing_count: 0,
          },
          sample_limit: 10000,
          sample_truncated: false,
          generated_at: '2026-01-01T00:11:00Z',
        },
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getMempoolPressure('mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/mempool/pressure?network=mainnet'),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      pendingBlobCount: 4,
      pendingBlobGas: 524288,
      pendingUniqueSenders: 3,
      feeDistribution: {
        min: '0.008794 Gwei',
        avg: '0.504839 Gwei',
        median: '0.010563 Gwei',
        p95: '1 Gwei',
        max: '2 Gwei',
      },
      pendingTransactionAge: {
        oldest: '12 min',
        newest: '21 sec',
        average: '5 min',
      },
      includability: {
        latestBlobBaseFee: '0.009389 Gwei',
        pricingAvailable: true,
        likelyIncludableCount: 3,
        underpricedCount: 1,
        unknownPricingCount: 0,
      },
    });
  });

  it('formats decimal total_cost_eth values as ETH', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));

    const result = transformBlobToMempoolTransaction({
      network_id: 1,
      network_name: 'mainnet',
      block_number: 0,
      blob_index: 0,
      tx_hash: '0xabc',
      from_address: '0x1234567890abcdef',
      blob_size_bytes: 131072,
      base_fee_per_blob_gas: '1000000000',
      tip_per_blob_gas: '0',
      total_cost_eth: '0.001',
      timestamp: '2026-01-01T00:00:00.000Z',
      confirmed: false,
    }, 0);

    expect(result.estimatedCost).toBe('0.001 ETH');
  });
});
