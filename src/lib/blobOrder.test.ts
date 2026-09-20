import type { BlobResponse } from '@/types';
import { orderBlobsByTxIndex } from './blobOrder';

function makeBlob(overrides: Partial<BlobResponse> & { tx_hash: string }): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 200,
    blob_index: 0,
    from_address: '0x1234567890abcdef1234567890abcdef12345678',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1000000000',
    tip_per_blob_gas: '0',
    total_cost_eth: '0.001',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: true,
    ...overrides,
  };
}

describe('orderBlobsByTxIndex', () => {
  it('sorts by transaction index, then blob index', () => {
    const blobs = [
      makeBlob({ tx_hash: '0xb', tx_index: 9, blob_index: 1 }),
      makeBlob({ tx_hash: '0xa', tx_index: 2, blob_index: 0 }),
      makeBlob({ tx_hash: '0xb', tx_index: 9, blob_index: 0 }),
    ];

    expect(orderBlobsByTxIndex(blobs).map((blob) => [blob.tx_index, blob.blob_index])).toEqual([
      [2, 0],
      [9, 0],
      [9, 1],
    ]);
  });

  it('keeps the API order when any blob has no transaction index', () => {
    const blobs = [
      makeBlob({ tx_hash: '0xb', tx_index: 9 }),
      makeBlob({ tx_hash: '0xa' }),
      makeBlob({ tx_hash: '0xc', tx_index: 1 }),
    ];

    expect(orderBlobsByTxIndex(blobs)).toBe(blobs);
  });

  it('leaves the input array untouched', () => {
    const blobs = [
      makeBlob({ tx_hash: '0xb', tx_index: 4 }),
      makeBlob({ tx_hash: '0xa', tx_index: 1 }),
    ];

    const sorted = orderBlobsByTxIndex(blobs);

    expect(sorted).not.toBe(blobs);
    expect(blobs[0].tx_index).toBe(4);
  });

  it('passes short lists straight through', () => {
    const blobs = [makeBlob({ tx_hash: '0xa' })];

    expect(orderBlobsByTxIndex(blobs)).toBe(blobs);
    expect(orderBlobsByTxIndex([])).toEqual([]);
  });
});
