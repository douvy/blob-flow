import { transformBlobToMempoolTransaction } from './api/mempool';
import {
  groupMempoolByTransaction,
  isPartiallySampled,
  withLowerBound,
} from './mempoolTransactions';
import type { BlobResponse, MempoolTransaction } from '../types';

const TX_HASH = `0x${'ab'.repeat(32)}`;
const OTHER_TX_HASH = `0x${'cd'.repeat(32)}`;

function versionedHash(byte: string): string {
  return `0x01${byte.repeat(31)}`;
}

/**
 * A mempool entry as the indexer sends it: one blob, with its own blob gas,
 * size and cost, plus the versioned hash list for the whole transaction.
 */
function makeEntry(overrides: Partial<BlobResponse> = {}): MempoolTransaction {
  const blob: BlobResponse = {
    network_id: 1,
    network_name: 'mainnet',
    block_number: null,
    blob_index: 0,
    tx_hash: TX_HASH,
    from_address: '0x1234567890abcdef1234567890abcdef12345678',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '3128924',
    tip_per_blob_gas: '27811286',
    total_cost_wei: '410114326528',
    total_cost_eth: '0.000000410114326528',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: false,
    user_attribution: 'Arbitrum One',
    max_fee_per_blob_gas: '30940210',
    blob_gas_used: 131072,
    realized_cost_wei: '410114326528',
    max_cost_wei: '4055395205120',
    fee_cap_headroom_percent: '89.887192',
    versioned_hashes: [versionedHash('aa'), versionedHash('bb'), versionedHash('cc')],
    ...overrides,
  };

  return transformBlobToMempoolTransaction(blob, blob.blob_index);
}

describe('groupMempoolByTransaction', () => {
  it('reports the transaction blob count, not the per-entry one', () => {
    const entries = [
      makeEntry({ blob_index: 0, versioned_hash: versionedHash('aa') }),
      makeEntry({ blob_index: 1, versioned_hash: versionedHash('bb') }),
      makeEntry({ blob_index: 2, versioned_hash: versionedHash('cc') }),
    ];

    const [transaction] = groupMempoolByTransaction(entries);

    // Every entry claims one blob; the transaction carries three.
    expect(entries.map((entry) => entry.blobCount)).toEqual([1, 1, 1]);
    expect(groupMempoolByTransaction(entries)).toHaveLength(1);
    expect(transaction.blobCount).toBe(3);
    expect(transaction.sampledBlobCount).toBe(3);
    expect(isPartiallySampled(transaction)).toBe(false);
  });

  it('sums size and cost across a transaction blob entries', () => {
    const entries = [
      makeEntry({ blob_index: 0 }),
      makeEntry({ blob_index: 1 }),
      makeEntry({ blob_index: 2 }),
    ];

    const [transaction] = groupMempoolByTransaction(entries);

    expect(transaction.blobSizeBytes).toBe(131072 * 3);
    // 3 x 410114326528 wei and 3 x 4055395205120 wei, so three times what a
    // single entry reports (410.1143 Gwei and 4,055.3952 Gwei).
    expect(transaction.realizedCost).toBe('1,230.343 Gwei');
    expect(transaction.maxCost).toBe('12,166.1856 Gwei');
    // Per-gas rates belong to the transaction, so they are not summed.
    expect(transaction.maxFeeGwei).toBe(entries[0].maxFeeGwei);
    expect(transaction.feeHeadroom).toBe(entries[0].feeHeadroom);
  });

  it('marks a transaction the sample cut in half as partially sampled', () => {
    // The sample limit can land mid-transaction, leaving one of its three
    // blobs in the list. The hash list still gives the true count, and the
    // totals cover only the entry in hand.
    const [transaction] = groupMempoolByTransaction([makeEntry({ blob_index: 2 })]);

    expect(transaction.blobCount).toBe(3);
    expect(transaction.sampledBlobCount).toBe(1);
    expect(isPartiallySampled(transaction)).toBe(true);
    expect(transaction.blobSizeBytes).toBe(131072);
    expect(withLowerBound(transaction.realizedCost, true)).toBe('410.1143 Gwei+');
  });

  it('falls back to the entries in hand when versioned hashes are missing', () => {
    const entries = [
      makeEntry({ blob_index: 0, versioned_hashes: undefined }),
      makeEntry({ blob_index: 1, versioned_hashes: undefined }),
    ];

    const [transaction] = groupMempoolByTransaction(entries);

    expect(transaction.blobCount).toBe(2);
    expect(isPartiallySampled(transaction)).toBe(false);
  });

  it('voids a total when an entry is missing the cost field', () => {
    const entries = [
      makeEntry({ blob_index: 0 }),
      makeEntry({ blob_index: 1, max_cost_wei: undefined }),
    ];

    const [transaction] = groupMempoolByTransaction(entries);

    expect(transaction.maxCost).toBe('-');
    // An unavailable value is never dressed up as a lower bound.
    expect(withLowerBound(transaction.maxCost, true)).toBe('-');
    expect(transaction.realizedCost).not.toBe('-');
  });

  it('keeps separate transactions apart and preserves list order', () => {
    const grouped = groupMempoolByTransaction([
      makeEntry({ blob_index: 0, tx_hash: OTHER_TX_HASH, versioned_hashes: undefined }),
      makeEntry({ blob_index: 0 }),
      makeEntry({ blob_index: 1 }),
    ]);

    expect(grouped.map((transaction) => transaction.txHash)).toEqual([OTHER_TX_HASH, TX_HASH]);
    expect(grouped.map((transaction) => transaction.blobCount)).toEqual([1, 3]);
  });

  it('groups entries whose hashes differ only in casing', () => {
    const grouped = groupMempoolByTransaction([
      makeEntry({ blob_index: 0 }),
      makeEntry({ blob_index: 1, tx_hash: TX_HASH.toUpperCase().replace('0X', '0x') }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].sampledBlobCount).toBe(2);
  });

  it('orders entries by blob index and takes the earliest first-seen time', () => {
    const grouped = groupMempoolByTransaction([
      makeEntry({ blob_index: 2, timestamp: '2026-01-01T00:00:09.000Z' }),
      makeEntry({ blob_index: 0, timestamp: '2026-01-01T00:00:03.000Z' }),
      makeEntry({ blob_index: 1, timestamp: 'not-a-timestamp' }),
    ]);

    expect(grouped[0].entries.map((entry) => entry.rawBlob.blob_index)).toEqual([0, 1, 2]);
    expect(grouped[0].timeInMempool).toBe('2026-01-01T00:00:03.000Z');
  });
});
