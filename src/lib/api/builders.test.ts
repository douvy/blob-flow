import { getBuilderByKey, getBuilderShareChart, getBuilders } from './builders';

const originalFetch = global.fetch;

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

function mockFetch(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(data));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function mockFailure(status: number, statusText: string) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, status, statusText });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const BUILDERS_PAYLOAD = {
  chain_id: 1,
  network_name: 'mainnet',
  range: '24h',
  window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
  totals: { blocks: 7200, blob_blocks: 3100, blobs: 12000 },
  generated_at: '2026-01-02T00:00:00.000Z',
  builders: [],
};

describe('api/builders', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches the builder list for the requested range and network', async () => {
    const fetchMock = mockFetch(BUILDERS_PAYLOAD);

    const result = await getBuilders('7d', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/builders?range=7d&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toBe(BUILDERS_PAYLOAD);
  });

  it('defaults to the 24h window', async () => {
    const fetchMock = mockFetch(BUILDERS_PAYLOAD);

    await getBuilders();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/builders?range=24h'),
      expect.any(Object)
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain('network=');
  });

  it('encodes the builder key, which carries colons and dashes', async () => {
    const detail = { ...BUILDERS_PAYLOAD, builder: { key: 'extra:titan builder' } };
    const fetchMock = mockFetch(detail);

    const result = await getBuilderByKey('extra:titan builder', '1h', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/builders/extra%3Atitan%20builder?range=1h&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toBe(detail);
  });

  it('defaults the detail lookup to the 24h window', async () => {
    const fetchMock = mockFetch({ ...BUILDERS_PAYLOAD, builder: { key: 'beaverbuild' } });

    await getBuilderByKey('beaverbuild');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/builders/beaverbuild?range=24h'),
      expect.any(Object)
    );
  });

  it('returns null when the builder has no block in the window', async () => {
    mockFailure(404, 'Not Found');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBuilderByKey('addr:0xdead', '1h', 'mainnet')).resolves.toBeNull();
  });

  it('returns null when the detail envelope carries no data', async () => {
    mockFetch(null);

    await expect(getBuilderByKey('beaverbuild')).resolves.toBeNull();
  });

  it('rethrows non-404 builder lookup failures', async () => {
    mockFailure(400, 'Bad Request');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBuilderByKey('beaverbuild', '1h')).rejects.toThrow('API error: 400');
  });

  it('fetches the share chart with range, granularity, and series limit', async () => {
    const chart = {
      chain_id: 1,
      network_name: 'mainnet',
      range: '30d',
      granularity: 'hour',
      bucket_seconds: 3600,
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-31T00:00:00.000Z',
      generated_at: '2026-01-31T00:00:00.000Z',
      series: [],
      points: [],
      summary: { total_blocks: 0, total_blobs: 0, shares: [] },
    };
    const fetchMock = mockFetch(chart);

    const result = await getBuilderShareChart('30d', 'mainnet', 'hour', 8);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/builder-share?range=30d&granularity=hour&limit=8&network=mainnet'),
      expect.any(Object)
    );
    expect(result).toBe(chart);
  });

  it('leaves the long-tail breakout to the backend when no limit is asked for', async () => {
    const fetchMock = mockFetch({ points: [] });

    await getBuilderShareChart();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/charts/builder-share?range=24h&granularity=auto'),
      expect.any(Object)
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain('limit=');
  });
});
