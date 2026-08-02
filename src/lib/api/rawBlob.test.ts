import { fetchRawBlob, RawBlobError } from './rawBlob';

const VERSIONED_HASH = `0x01${'ab'.repeat(31)}`;

function bytesResponse(bytes: Uint8Array) {
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
  };
}

describe('api/rawBlob', () => {
  it('fetches raw bytes from the proxy route with slot, hash, and network', async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(bytesResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRawBlob(123, VERSIONED_HASH, 'mainnet');

    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toContain('/api/raw-blob?');
    expect(requestedUrl).toContain('slot=123');
    expect(requestedUrl).toContain(`versioned_hash=${VERSIONED_HASH}`);
    expect(requestedUrl).toContain('network=mainnet');
  });

  it('surfaces the JSON error message and status from the proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Blob not found in the archive.' }),
      })
    );

    const failure = await fetchRawBlob(123, VERSIONED_HASH, 'mainnet').catch((e) => e);
    expect(failure).toBeInstanceOf(RawBlobError);
    expect(failure.status).toBe(404);
    expect(failure.message).toBe('Blob not found in the archive.');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json');
        },
      })
    );

    const failure = await fetchRawBlob(123, VERSIONED_HASH, 'mainnet').catch((e) => e);
    expect(failure).toBeInstanceOf(RawBlobError);
    expect(failure.status).toBe(502);
    expect(failure.message).toBe('Raw blob request failed (502).');
  });

  it('reports aborted requests as timeouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))
    );

    const failure = await fetchRawBlob(123, VERSIONED_HASH, 'mainnet').catch((e) => e);
    expect(failure).toBeInstanceOf(RawBlobError);
    expect(failure.status).toBe(0);
    expect(failure.message).toBe('Raw blob request timed out.');
  });

  it('wraps transport failures in a RawBlobError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    const failure = await fetchRawBlob(123, VERSIONED_HASH, 'mainnet').catch((e) => e);
    expect(failure).toBeInstanceOf(RawBlobError);
    expect(failure.status).toBe(0);
    expect(failure.message).toBe('Raw blob request failed.');
  });
});

describe('api/rawBlob status', () => {
  it('returns the deployment status when the endpoint responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { enabled: true, network: 'mainnet' } }),
      })
    );

    const { fetchRawBlobStatus } = await import('./rawBlob');
    expect(await fetchRawBlobStatus()).toEqual({ enabled: true, network: 'mainnet' });
  });

  it('throws on non-OK responses, bad payloads, and transport errors so callers retry', async () => {
    const { fetchRawBlobStatus } = await import('./rawBlob');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchRawBlobStatus()).rejects.toThrow('Raw blob status request failed (500).');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) })
    );
    await expect(fetchRawBlobStatus()).rejects.toThrow('Raw blob status response was malformed.');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    await expect(fetchRawBlobStatus()).rejects.toThrow('network down');
  });
});

describe('api/rawBlob availability probe and download url', () => {
  it('maps probe statuses to availability values', async () => {
    const { checkRawBlobAvailability } = await import('./rawBlob');

    const cases: Array<[number, string]> = [
      [200, 'available'],
      [503, 'pending'],
      [404, 'missing'],
      [502, 'error'],
    ];
    for (const [status, expected] of cases) {
      const fetchMock = vi.fn().mockResolvedValue({ ok: status === 200, status });
      vi.stubGlobal('fetch', fetchMock);
      expect(await checkRawBlobAvailability(9, `0x01${'ab'.repeat(31)}`, 'mainnet')).toBe(
        expected
      );
      expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { method: 'HEAD' });
    }

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('down')));
    expect(await checkRawBlobAvailability(9, `0x01${'ab'.repeat(31)}`, 'mainnet')).toBe('error');
  });

  it('builds a download URL with the attachment flag', async () => {
    const { rawBlobDownloadUrl } = await import('./rawBlob');
    const hash = `0x01${'ab'.repeat(31)}`;
    expect(rawBlobDownloadUrl(123, hash, 'mainnet')).toBe(
      `/api/raw-blob?slot=123&versioned_hash=${hash}&network=mainnet&download=1`
    );
  });
});
