import { BlobResponse } from '../../types';
import { getBlobTransaction } from './transactions';

const originalFetch = global.fetch;

const TX_HASH = '0xaaaa000000000000000000000000000000000000000000000000000000000001';
const OTHER_TX_HASH = '0xbbbb000000000000000000000000000000000000000000000000000000000002';

function makeBlob(overrides: Partial<BlobResponse> = {}): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 100,
    blob_index: 0,
    tx_hash: TX_HASH,
    from_address: '0x1111111111111111111111111111111111111111',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '250000000',
    tip_per_blob_gas: '0',
    total_cost_eth: '0.001',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: true,
    ...overrides,
  };
}

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

function blockResponse(blobs: BlobResponse[]) {
  return jsonResponse({
    block_number: 100,
    blob_count: blobs.length,
    timestamp: '2026-01-01T00:00:00.000Z',
    blobs,
  });
}

function notFoundResponse() {
  return { ok: false, status: 404, statusText: 'Not Found' };
}

describe('api/transactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('collects every blob the transaction carries, ordered by blob index', async () => {
    const blobs = [
      makeBlob({ blob_index: 1 }),
      makeBlob({ blob_index: 0 }),
      makeBlob({ blob_index: 0, tx_hash: OTHER_TX_HASH }),
    ];
    global.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(makeBlob({ blob_index: 1 })))
      .mockResolvedValueOnce(blockResponse(blobs)) as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(transaction?.blobs.map((blob) => blob.blob_index)).toEqual([0, 1]);
    expect(transaction?.blockNumber).toBe(100);
    expect(transaction?.confirmed).toBe(true);
    expect(transaction?.primary.blob_index).toBe(1);
  });

  it('matches sibling blobs regardless of tx hash casing', async () => {
    // Blob indexes the primary row does not have, so the assertion only holds
    // if the block's rows really were matched to this transaction.
    const blobs = [
      makeBlob({ blob_index: 3, tx_hash: TX_HASH.toUpperCase() }),
      makeBlob({ blob_index: 4, tx_hash: TX_HASH.toUpperCase() }),
    ];
    global.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(makeBlob()))
      .mockResolvedValueOnce(blockResponse(blobs)) as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(transaction?.blobs.map((blob) => blob.blob_index)).toEqual([3, 4]);
    expect(transaction?.blobsComplete).toBe(true);
  });

  it('falls back to the single blob row when the block lookup fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(makeBlob()))
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(transaction?.blobs).toHaveLength(1);
    expect(transaction?.blockNumber).toBe(100);
    // Nothing proves this row is the whole transaction, so callers must not
    // read its size and cost as transaction totals.
    expect(transaction?.blobsComplete).toBe(false);
  });

  it('treats a single-blob row as complete when its hash list says so', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse(makeBlob({ versioned_hashes: [`0x01${'aa'.repeat(31)}`] }))
      )
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(transaction?.blobsComplete).toBe(true);
  });

  it('reports an incomplete set when the block omits the transaction', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(makeBlob()))
      .mockResolvedValueOnce(
        blockResponse([makeBlob({ blob_index: 0, tx_hash: OTHER_TX_HASH })])
      ) as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(transaction?.blobs).toHaveLength(1);
    expect(transaction?.blobsComplete).toBe(false);
  });

  it('skips the block lookup for a pending transaction', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(makeBlob({ confirmed: false, block_number: 0 })));
    global.fetch = fetchMock as unknown as typeof fetch;

    const transaction = await getBlobTransaction(TX_HASH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(transaction?.confirmed).toBe(false);
    expect(transaction?.blockNumber).toBeNull();
    expect(transaction?.blobs).toHaveLength(1);
  });

  it('returns null when no indexed transaction has the hash', async () => {
    global.fetch = vi.fn().mockResolvedValue(notFoundResponse()) as unknown as typeof fetch;

    await expect(getBlobTransaction(TX_HASH)).resolves.toBeNull();
  });

  it('propagates non-404 failures', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }) as unknown as typeof fetch;

    await expect(getBlobTransaction(TX_HASH)).rejects.toThrow('API error: 500');
  });
});
