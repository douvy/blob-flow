import { transformBlobToMempoolTransaction } from './api/mempool';
import {
  aggregateMempoolAttribution,
  countLikelyIncludable,
} from './mempoolAttribution';
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
      uniqueSenderCount: 0,
      oldestTimestamp: null,
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
      {
        user: 'Base',
        txCount: 2,
        blobCount: 3,
        blobSizeBytes: 3 * 131072,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
      {
        user: 'Arbitrum',
        txCount: 1,
        blobCount: 1,
        blobSizeBytes: 131072,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
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
      {
        user: 'Base',
        txCount: 1,
        blobCount: 3,
        blobSizeBytes: 3 * 131072,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    ]);
  });

  it('buckets unattributed transactions under Unknown', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', user_attribution: undefined }),
    ]);

    expect(summary.groups).toEqual([
      {
        user: 'Unknown',
        txCount: 1,
        blobCount: 1,
        blobSizeBytes: 131072,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
    ]);
  });

  it('sets a group address only when every sender shares one address', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({
        tx_hash: '0x01',
        user_attribution: 'Base',
        from_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
      makeTransaction({
        tx_hash: '0x02',
        user_attribution: 'Base',
        from_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      }),
      makeTransaction({
        tx_hash: '0x03',
        user_attribution: 'Arbitrum',
        from_address: '0xcccccccccccccccccccccccccccccccccccccccc',
      }),
    ]);

    const base = summary.groups.find((group) => group.user === 'Base');
    const arbitrum = summary.groups.find((group) => group.user === 'Arbitrum');

    expect(base?.address).toBeUndefined();
    expect(arbitrum?.address).toBe('0xcccccccccccccccccccccccccccccccccccccccc');
  });

  it('dedupes sender addresses case-insensitively', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({
        tx_hash: '0x01',
        user_attribution: 'Base',
        from_address: '0xAbCdeF1234567890abcdef1234567890abcdEF12',
      }),
      makeTransaction({
        tx_hash: '0x02',
        user_attribution: 'Base',
        from_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      }),
    ]);

    const base = summary.groups.find((group) => group.user === 'Base');
    // Same address in two casings collapses to one, so it still links, using
    // the first-seen casing.
    expect(base?.address).toBe('0xAbCdeF1234567890abcdef1234567890abcdEF12');
  });

  it('counts unique senders case-insensitively and tracks the oldest timestamp', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({
        tx_hash: '0x01',
        from_address: '0xAbCdeF1234567890abcdef1234567890abcdEF12',
        timestamp: '2026-01-01T00:00:10.000Z',
      }),
      makeTransaction({
        tx_hash: '0x02',
        from_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        timestamp: '2026-01-01T00:00:05.000Z',
      }),
      makeTransaction({
        tx_hash: '0x03',
        from_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        timestamp: '2026-01-01T00:00:20.000Z',
      }),
    ]);

    expect(summary.uniqueSenderCount).toBe(2);
    expect(summary.oldestTimestamp).toBe('2026-01-01T00:00:05.000Z');
  });

  it('ignores unparseable timestamps when tracking the oldest entry', () => {
    const summary = aggregateMempoolAttribution([
      makeTransaction({ tx_hash: '0x01', timestamp: 'not-a-timestamp' }),
      makeTransaction({ tx_hash: '0x02', timestamp: '2026-01-01T00:00:05.000Z' }),
    ]);

    // The malformed first entry must not pin the oldest slot to a NaN.
    expect(summary.oldestTimestamp).toBe('2026-01-01T00:00:05.000Z');
  });

  it('counts entries whose fee cap clears the base fee', () => {
    const transactions = [
      makeTransaction({ tx_hash: '0x01', max_fee_per_blob_gas: '2000000000' }),
      makeTransaction({ tx_hash: '0x02', max_fee_per_blob_gas: '1000000000' }),
      makeTransaction({ tx_hash: '0x03', max_fee_per_blob_gas: '999999999' }),
    ];

    // Exactly-at-base-fee counts as includable, below does not.
    expect(countLikelyIncludable(transactions, '1000000000')).toBe(2);
    expect(countLikelyIncludable([], '1000000000')).toBe(0);
  });

  it('returns null without a base fee and skips unpriced entries', () => {
    const transactions = [
      makeTransaction({ tx_hash: '0x01', max_fee_per_blob_gas: '2000000000' }),
      makeTransaction({ tx_hash: '0x02', max_fee_per_blob_gas: undefined }),
    ];

    expect(countLikelyIncludable(transactions, null)).toBeNull();
    expect(countLikelyIncludable(transactions, 'not-a-number')).toBeNull();
    // The unpriced entry is skipped rather than assumed includable.
    expect(countLikelyIncludable(transactions, '1000000000')).toBe(1);
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
