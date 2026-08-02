import { GET } from './route';

const VERSIONED_HASH = `0x01${'ab'.repeat(31)}`;
const ARCHIVE_URL = 'http://archive.test:8550/live';

function requestFor(params: Record<string, string>): Request {
  const search = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/raw-blob?${search}`);
}

function validParams(): Record<string, string> {
  return { slot: '123', versioned_hash: VERSIONED_HASH, network: 'mainnet' };
}

function upstreamBlob(byteLength = 131072) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    arrayBuffer: async () => new ArrayBuffer(byteLength),
  };
}

describe('GET /api/raw-blob', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 501 when BLOB_ARCHIVE_URL is not configured', async () => {
    const response = await GET(requestFor(validParams()));
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('not configured');
  });

  it('rejects invalid slot and versioned_hash parameters', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);

    const badSlot = await GET(requestFor({ ...validParams(), slot: 'abc' }));
    expect(badSlot.status).toBe(400);

    const badHash = await GET(requestFor({ ...validParams(), versioned_hash: '0x02deadbeef' }));
    expect(badHash.status).toBe(400);
  });

  it('rejects networks the archive is not configured for', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);

    const response = await GET(requestFor({ ...validParams(), network: 'sepolia' }));
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toContain('sepolia');
  });

  it('proxies a blob from the archive with immutable caching', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', `${ARCHIVE_URL}/`);
    const fetchMock = vi.fn().mockResolvedValue(upstreamBlob());
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(requestFor(validParams()));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect((await response.arrayBuffer()).byteLength).toBe(131072);

    const [upstreamUrl, init] = fetchMock.mock.calls[0];
    expect(upstreamUrl).toBe(
      `${ARCHIVE_URL}/eth/v1/beacon/blobs/123?versioned_hashes=${VERSIONED_HASH}`
    );
    expect(init.headers.Accept).toBe('application/octet-stream');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('sends a bearer token when BLOB_ARCHIVE_TOKEN is set', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubEnv('BLOB_ARCHIVE_TOKEN', 'secret');
    const fetchMock = vi.fn().mockResolvedValue(upstreamBlob());
    vi.stubGlobal('fetch', fetchMock);

    await GET(requestFor(validParams()));

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
  });

  it('maps upstream 404 to a not-found error', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() })
    );

    const response = await GET(requestFor(validParams()));
    expect(response.status).toBe(404);
    expect((await response.json()).error).toContain('not found');
  });

  it('maps upstream 503 to still-syncing and forwards Retry-After', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'Retry-After': '30' }),
      })
    );

    const response = await GET(requestFor(validParams()));
    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect((await response.json()).error).toContain('not synced');
  });

  it('maps other upstream failures and bad payloads to 502', async () => {
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, headers: new Headers() })
    );
    expect((await GET(requestFor(validParams()))).status).toBe(502);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstreamBlob(12)));
    expect((await GET(requestFor(validParams()))).status).toBe(502);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('unreachable')));
    const transport = await GET(requestFor(validParams()));
    expect(transport.status).toBe(502);
    expect((await transport.json()).error).toContain('Could not reach');
  });
});

describe('HEAD /api/raw-blob', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('answers availability with bare status codes and no body', async () => {
    const { HEAD } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);

    const cancel = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: { cancel },
      })
    );
    const available = await HEAD(new Request(`http://localhost/api/raw-blob?slot=123&versioned_hash=${VERSIONED_HASH}&network=mainnet`));
    expect(available.status).toBe(200);
    expect(available.body).toBeNull();
    expect(cancel).toHaveBeenCalled();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'Retry-After': '12' }),
        body: { cancel: vi.fn() },
      })
    );
    const pending = await HEAD(new Request(`http://localhost/api/raw-blob?slot=123&versioned_hash=${VERSIONED_HASH}&network=mainnet`));
    expect(pending.status).toBe(503);
    expect(pending.body).toBeNull();
  });

  it('reports missing configuration without a body', async () => {
    const { HEAD } = await import('./route');
    const response = await HEAD(new Request('http://localhost/api/raw-blob?slot=1&versioned_hash=0x01aa'));
    expect(response.status).toBe(501);
    expect(response.body).toBeNull();
  });
});

describe('GET /api/raw-blob download mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('adds a Content-Disposition filename when download=1', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => new ArrayBuffer(131072),
      })
    );

    const plain = await GET(new Request(`http://localhost/api/raw-blob?slot=123&versioned_hash=${VERSIONED_HASH}&network=mainnet`));
    expect(plain.headers.get('Content-Disposition')).toBeNull();

    const download = await GET(new Request(`http://localhost/api/raw-blob?slot=123&versioned_hash=${VERSIONED_HASH}&network=mainnet&download=1`));
    expect(download.headers.get('Content-Disposition')).toBe(
      `attachment; filename="blob-${VERSIONED_HASH}.bin"`
    );
  });
});

describe('GET /api/raw-blob hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects unexpected query parameters', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);

    const response = await GET(requestFor({ ...validParams(), nonce: '7' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('nonce');
  });

  it('canonicalizes the slot before addressing the archive', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    const fetchMock = vi.fn().mockResolvedValue(upstreamBlob());
    vi.stubGlobal('fetch', fetchMock);

    await GET(requestFor({ ...validParams(), slot: '000123' }));
    expect(fetchMock.mock.calls[0][0]).toContain('/eth/v1/beacon/blobs/123?');
  });

  it('relays the archive bytes unchanged', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    const payload = new Uint8Array(131072);
    for (let i = 0; i < payload.length; i++) payload[i] = i % 251;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => payload.buffer,
      })
    );

    const response = await GET(requestFor(validParams()));
    const relayed = new Uint8Array(await response.arrayBuffer());
    expect(relayed.length).toBe(131072);
    expect(Array.from(relayed.slice(0, 8))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(relayed[131071]).toBe(131071 % 251);
  });

  it('rejects declared-oversize responses before buffering', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    const cancel = vi.fn();
    const arrayBuffer = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Length': '999999999' }),
        body: { cancel },
        arrayBuffer,
      })
    );

    const response = await GET(requestFor(validParams()));
    expect(response.status).toBe(502);
    expect(cancel).toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('maps body read failures to 502 instead of crashing', async () => {
    const { GET } = await import('./route');
    vi.stubEnv('BLOB_ARCHIVE_URL', ARCHIVE_URL);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        arrayBuffer: async () => {
          throw new Error('connection reset mid-body');
        },
      })
    );

    const response = await GET(requestFor(validParams()));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('Could not read');
  });
});
