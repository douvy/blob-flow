import { transformBlobToMempoolTransaction } from './api/mempool';
import { aggregateMempoolAttribution } from './mempoolAttribution';
import { BlobResponse } from '@/types';

function makeBlob(overrides: Partial<BlobResponse>): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 0,
    blob_index: 0,
    tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from_address: '0x1234567890abcdef1234567890abcdef12345678',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1000000000',
    tip_per_blob_gas: '100000000',
    total_cost_eth: '0.001',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: false,
    user_attribution: 'Base',
    max_fee_per_blob_gas: '2000000000',
    blob_gas_used: 131072,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<BlobResponse>) {
  return transformBlobToMempoolTransaction(makeBlob(overrides), 0);
}

describe('aggregateMempoolAttribution', () => {
  it('returns an empty summary for no transactions', () => {
    expect(aggregateMempoolAttribution([])).toEqual({
      txCount: 0,
      blobCount: 0,
      blobSizeBytes: 0,
      groups: [],
    });
  });

  it('groups transactions by user and totals blobs and bytes', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', user_attribution: 'Base' }),
      makeTransaction({
        tx_hash: '0x02',
        user_attribution: 'Base',
        blob_gas_used: 262144,
        blob_size_bytes: 262144,
      }),
      makeTransaction({ tx_hash: '0x03', user_attribution: 'Arbitrum' }),
    ]);

    expect(summary.txCount).toBe(3);
    expect(summary.blobCount).toBe(4);
    expect(summary.blobSizeBytes).toBe(4 * 131072);
    expect(summary.groups).toEqual([
      { user: 'Base', txCount: 2, blobCount: 3, blobSizeBytes: 3 * 131072 },
      { user: 'Arbitrum', txCount: 1, blobCount: 1, blobSizeBytes: 131072 },
    ]);
  });

  it('counts per-blob entries sharing a tx hash as one transaction', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', blob_index: 0, user_attribution: 'Base' }),
      makeTransaction({ tx_hash: '0x01', blob_index: 1, user_attribution: 'Base' }),
      makeTransaction({ tx_hash: '0x01', blob_index: 2, user_attribution: 'Base' }),
    ]);

    expect(summary.txCount).toBe(1);
    expect(summary.blobCount).toBe(3);
    expect(summary.groups).toEqual([
      { user: 'Base', txCount: 1, blobCount: 3, blobSizeBytes: 3 * 131072 },
    ]);
  });

  it('buckets unattributed transactions under Unknown', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', user_attribution: undefined }),
    ]);

    expect(summary.groups).toEqual([
      { user: 'Unknown', txCount: 1, blobCount: 1, blobSizeBytes: 131072 },
    ]);
  });

  it('sorts by blob volume, then tx count, then name', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', user_attribution: 'Optimism' }),
      makeTransaction({ tx_hash: '0x02', user_attribution: 'Arbitrum' }),
      makeTransaction({
        tx_hash: '0x03',
        user_attribution: 'zkSync',
        blob_gas_used: 393216,
        blob_size_bytes: 393216,
      }),
    ]);

    expect(summary.groups.map((group) => group.user)).toEqual([
      'zkSync',
      'Arbitrum',
      'Optimism',
    ]);
  });
});
