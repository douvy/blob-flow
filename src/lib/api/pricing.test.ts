import { getBlobPricing } from './pricing';

const originalFetch = global.fetch;

describe('api/pricing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps blob pricing and fork params for display', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          network_id: 1,
          network_name: 'mainnet',
          current_base_fee: '9389122',
          current_base_fee_gwei: '0.009389122',
          current_excess_gas: 187598122,
          current_utilization: '0.357143',
          predicted_next_fee: '8487503',
          predicted_next_fee_gwei: '0.008487503',
          fork_stage: 'BPO2',
          blob_params: {
            target: 14,
            max: 21,
            update_fraction: 11684671,
            target_gas: 1835008,
            max_gas: 2752512,
          },
          market_pressure: {
            recent_blocks_above_target: 2,
            consecutive_full_blocks: 1,
            percent_recent_blocks_at_max_blobs: 10,
            predicted_direction: 'down',
            next_block_fee_estimate: {
              low: '6935695',
              high: '8487503',
            },
          },
          recent_blocks: [
            {
              block_number: 100,
              block_timestamp: '2026-01-01T00:00:00Z',
              blob_count: 4,
              blob_gas_used: 1310720,
              blob_gas_target: 1835008,
              blob_gas_limit: 2752512,
              excess_blob_gas: 187598122,
              blob_base_fee: '9389122',
              blob_base_fee_gwei: '0.009389122',
              utilization_ratio: '0.714286',
              blob_params_target: 14,
              blob_params_max: 21,
              target_blobs: 14,
              max_blobs: 21,
              available_blobs: 17,
              utilization_percent: 19.05,
              is_full: false,
              is_above_target: false,
              update_fraction: 11684671,
            },
          ],
        },
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getBlobPricing('mainnet', 20);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/blob/pricing?blocks=20&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      networkName: 'mainnet',
      currentBaseFee: '0.009389 Gwei',
      predictedNextFee: '0.008488 Gwei',
      currentExcessGas: 187598122,
      currentUtilization: 0.357143,
      forkStage: 'BPO2',
      blobParams: {
        target: 14,
        max: 21,
        targetGas: 1835008,
        maxGas: 2752512,
      },
      marketPressure: {
        recentBlocksAboveTarget: 2,
        consecutiveFullBlocks: 1,
        predictedDirection: 'down',
        nextBlockFeeEstimate: {
          low: '0.006936 Gwei',
          high: '0.008488 Gwei',
        },
      },
    });
    expect(result.recentBlocks[0]).toMatchObject({
      blockNumber: 100,
      blobCount: 4,
      blobBaseFee: '0.009389 Gwei',
      utilizationRatio: 0.714286,
      targetBlobs: 14,
      maxBlobs: 21,
    });
  });
});
