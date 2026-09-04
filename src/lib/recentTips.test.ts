import { describeTopTip, summarizeRecentTips } from './recentTips';
import type { BlobResponse, Block } from '@/types';

function blob(txHash: string, attribution: string, feeGwei: string | undefined, index: number): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 100,
    blob_index: index,
    tx_hash: txHash,
    from_address: '0xsender',
    user_attribution: attribution,
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1',
    tip_per_blob_gas: '0',
    total_cost_eth: '0',
    timestamp: '2026-09-04T10:00:00Z',
    confirmed: true,
    priority_fee_per_gas_gwei: feeGwei,
  };
}

function block(number: number, blobs: BlobResponse[]): Block {
  return {
    id: number,
    number: String(number),
    blobCount: blobs.length,
    blobGasUsed: 0,
    blobGasTarget: 0,
    blobGasLimit: 0,
    targetBlobs: 6,
    maxBlobs: 9,
    availableBlobs: 0,
    baseFeeGwei: '1',
    utilizationPercent: 0,
    isFull: false,
    isAboveTarget: false,
    timestamp: '2026-09-04T10:00:00Z',
    attribution: [],
    blobs,
  };
}

describe('summarizeRecentTips', () => {
  it('finds the top bid, who paid it, and its multiple of the median', () => {
    const summary = summarizeRecentTips([
      block(102, [blob('0xop', 'Optimism', '12', 0), blob('0xop', 'Optimism', '12', 1), blob('0xarb', 'Arbitrum', '1', 2)]),
      block(101, [blob('0xbase', 'Base', '1', 0), blob('0xzk', 'zkSync', '0.5', 1)]),
      block(100, [blob('0xarb2', 'Arbitrum', '1', 0)]),
    ]);

    expect(summary.blockCount).toBe(3);
    expect(summary.pricedBlobs).toBe(6);
    // Blob-weighted: 0.5, 1, 1, 1, 12, 12 => median 1.
    expect(summary.medianGwei).toBe(1);
    expect(summary.topGwei).toBe(12);
    expect(summary.topAttribution).toBe('Optimism');
    expect(summary.topBlockNumber).toBe(102);
    expect(summary.topMultiple).toBe(12);
    expect(summary.contested).toBe(true);
  });

  it('is not contested while bids sit near the median', () => {
    const summary = summarizeRecentTips([
      block(101, [blob('0xa', 'Optimism', '1.2', 0), blob('0xb', 'Arbitrum', '1', 1), blob('0xc', 'Base', '0.9', 2)]),
      block(100, [blob('0xd', 'zkSync', '1.1', 0), blob('0xe', 'Base', '1', 1)]),
    ]);

    expect(summary.topGwei).toBe(1.2);
    expect(summary.contested).toBe(false);
  });

  it('needs enough priced blobs before one outlier counts as contested', () => {
    const summary = summarizeRecentTips([
      block(100, [blob('0xa', 'Optimism', '30', 0), blob('0xb', 'Arbitrum', '1', 1), blob('0xc', 'Base', '1', 2)]),
    ]);

    expect(summary.topMultiple).toBe(30);
    expect(summary.contested).toBe(false);
  });

  it('ignores blocks indexed before tips were stored', () => {
    const summary = summarizeRecentTips([
      block(101, [blob('0xold', 'Base', undefined, 0)]),
      block(100, [blob('0xa', 'Optimism', '2', 0)]),
    ]);

    expect(summary.blockCount).toBe(1);
    expect(summary.pricedBlobs).toBe(1);
    expect(summary.topGwei).toBe(2);
    expect(summary.topMultiple).toBe(1);
  });

  it('reports nothing without priced blobs', () => {
    expect(summarizeRecentTips([block(100, []), block(99, [blob('0xold', 'Base', undefined, 0)])])).toEqual({
      blockCount: 0,
      pricedBlobs: 0,
      medianGwei: null,
      topGwei: null,
      topAttribution: null,
      topBlockNumber: null,
      topMultiple: null,
      contested: false,
    });
  });

  it('leaves the multiple undefined when every tip is zero', () => {
    const summary = summarizeRecentTips([
      block(100, [blob('0xa', 'Optimism', '0', 0), blob('0xb', 'Arbitrum', '0', 1)]),
    ]);

    expect(summary.topGwei).toBe(0);
    expect(summary.topMultiple).toBeNull();
    expect(summary.contested).toBe(false);
  });
});

describe('describeTopTip', () => {
  const base = {
    blockCount: 30,
    pricedBlobs: 120,
    medianGwei: 1,
    topGwei: 1.5,
    topAttribution: 'Base',
    topBlockNumber: 100,
    topMultiple: 1.5,
    contested: false,
  };

  it('names the bidder and the sample while the market is calm', () => {
    expect(describeTopTip(base)).toEqual({
      value: '1.5 Gwei',
      hint: 'Base · last 30 blocks',
      alert: false,
    });
  });

  it('switches to the alert tone and quotes the multiple when contested', () => {
    expect(describeTopTip({ ...base, topGwei: 12.25, topAttribution: 'Optimism', topMultiple: 12.25, contested: true })).toEqual({
      value: '12.25 Gwei',
      hint: 'Optimism · 12x the median',
      alert: true,
    });
    expect(describeTopTip({ ...base, topGwei: 3.4, topMultiple: 3.42, contested: true }).hint).toBe('Base · 3.4x the median');
  });

  it('shows a placeholder before any tips are recorded', () => {
    expect(describeTopTip({ ...base, topGwei: null, topAttribution: null, topMultiple: null, blockCount: 0 })).toEqual({
      value: '-',
      hint: 'no tips recorded yet',
      alert: false,
    });
  });
});
