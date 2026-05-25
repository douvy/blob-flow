import { getMempool } from './mempool';

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
            transaction_url: 'https://etherscan.io/tx/0xabc',
            from_address: '0x1234567890abcdef',
            from_address_url: 'https://etherscan.io/address/0x1234567890abcdef',
            user_attribution: 'Base',
            blob_size_bytes: 33554432,
            blob_gas_used: 262144,
            base_fee_per_blob_gas_gwei: '0.25',
            tip_per_blob_gas_gwei: '0.1',
            max_fee_per_blob_gas_gwei: '1',
            total_cost_eth: '1000000000',
            realized_cost_wei: '1000000000',
            max_cost_wei: '262144000000000',
            fee_cap_headroom_percent: '99.62',
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
      transactionUrl: 'https://etherscan.io/tx/0xabc',
      fromAddress: '0x1234...',
      fromAddressFull: '0x1234567890abcdef',
      fromAddressUrl: 'https://etherscan.io/address/0x1234567890abcdef',
      user: 'Base',
      blobCount: 2,
      maxFeeGwei: '1 Gwei',
      feeHeadroom: '99.6%',
      timeInMempool: '5 min ago',
    });
    expect(result.data[0].estimatedCost).toBe('<0.000001 ETH');
    expect(result.data[0].maxCost).toBe('0.000262 ETH');
  });
});
