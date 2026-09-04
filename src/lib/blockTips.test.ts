import { summarizeBlockTips } from './blockTips';
import type { BlobResponse } from '@/types';

function makeBlob(overrides: Partial<BlobResponse>): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 100,
    blob_index: 0,
    tx_hash: '0xabc',
    from_address: '0xsender',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1',
    tip_per_blob_gas: '0',
    total_cost_eth: '0',
    timestamp: '2026-09-04T10:00:00Z',
    confirmed: true,
    ...overrides,
  };
}

describe('summarizeBlockTips', () => {
  it('rolls blobs up per transaction and orders the highest bid first', () => {
    const summary = summarizeBlockTips([
      makeBlob({ blob_index: 0, tx_hash: '0xarb', user_attribution: 'Arbitrum', priority_fee_per_gas_gwei: '1' }),
      makeBlob({ blob_index: 1, tx_hash: '0xop', user_attribution: 'Optimism', priority_fee_per_gas_gwei: '5' }),
      makeBlob({ blob_index: 2, tx_hash: '0xop', user_attribution: 'Optimism', priority_fee_per_gas_gwei: '5' }),
      makeBlob({ blob_index: 3, tx_hash: '0xanon', from_address: '0xnobody', priority_fee_per_gas: '2000000000' }),
    ]);

    expect(summary.totalBlobs).toBe(4);
    expect(summary.pricedBlobs).toBe(4);
    // (1 + 5 + 5 + 2) / 4 blobs: the two-blob transaction counts twice.
    expect(summary.averageGwei).toBe(3.25);
    expect(summary.maxGwei).toBe(5);
    expect(summary.transactions).toEqual([
      { txHash: '0xop', attribution: 'Optimism', fromAddress: '0xsender', blobCount: 2, pricedBlobCount: 2, priorityFeeGwei: 5 },
      { txHash: '0xanon', attribution: 'Unknown', fromAddress: '0xnobody', blobCount: 1, pricedBlobCount: 1, priorityFeeGwei: 2 },
      { txHash: '0xarb', attribution: 'Arbitrum', fromAddress: '0xsender', blobCount: 1, pricedBlobCount: 1, priorityFeeGwei: 1 },
    ]);
  });

  it('takes the fee from any priced row of a partially recorded transaction', () => {
    const summary = summarizeBlockTips([
      makeBlob({ blob_index: 0, tx_hash: '0xmixed', user_attribution: 'Optimism' }),
      makeBlob({ blob_index: 1, tx_hash: '0xmixed', user_attribution: 'Optimism', priority_fee_per_gas_gwei: '4' }),
      makeBlob({ blob_index: 2, tx_hash: '0xmixed', user_attribution: 'Optimism' }),
    ]);

    expect(summary.pricedBlobs).toBe(1);
    expect(summary.averageGwei).toBe(4);
    expect(summary.transactions).toEqual([
      { txHash: '0xmixed', attribution: 'Optimism', fromAddress: '0xsender', blobCount: 3, pricedBlobCount: 1, priorityFeeGwei: 4 },
    ]);
  });

  it('keeps unpriced legacy rows out of the averages and lists them last', () => {
    const summary = summarizeBlockTips([
      makeBlob({ blob_index: 0, tx_hash: '0xlegacy', user_attribution: 'Base' }),
      makeBlob({ blob_index: 1, tx_hash: '0xop', user_attribution: 'Optimism', priority_fee_per_gas_gwei: '0.5' }),
    ]);

    expect(summary.totalBlobs).toBe(2);
    expect(summary.pricedBlobs).toBe(1);
    expect(summary.averageGwei).toBe(0.5);
    expect(summary.maxGwei).toBe(0.5);
    expect(summary.transactions.map((tx) => [tx.txHash, tx.priorityFeeGwei])).toEqual([
      ['0xop', 0.5],
      ['0xlegacy', null],
    ]);
  });

  it('reports no figures for a block indexed before tips were tracked', () => {
    const summary = summarizeBlockTips([makeBlob({}), makeBlob({ blob_index: 1, tx_hash: '0xdef' })]);

    expect(summary.pricedBlobs).toBe(0);
    expect(summary.averageGwei).toBeNull();
    expect(summary.maxGwei).toBeNull();
    expect(summary.transactions).toHaveLength(2);
  });

  it('treats a malformed fee as unrecorded and handles an empty block', () => {
    expect(summarizeBlockTips([makeBlob({ priority_fee_per_gas_gwei: 'nope' })]).pricedBlobs).toBe(0);
    expect(summarizeBlockTips([])).toEqual({
      totalBlobs: 0,
      pricedBlobs: 0,
      averageGwei: null,
      maxGwei: null,
      transactions: [],
    });
  });
});
