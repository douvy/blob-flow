import { isServedNetwork } from './serverNetworks';

const originalFetch = global.fetch;

function networksResponse(names: string[]) {
  return {
    ok: true,
    json: async () => ({ success: true, data: names.map((name) => ({ chain_id: 1, name })) }),
  };
}

describe('isServedNetwork', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('accepts a network the indexer serves', async () => {
    global.fetch = vi.fn().mockResolvedValue(networksResponse(['mainnet', 'hoodi'])) as
      unknown as typeof fetch;

    await expect(isServedNetwork('hoodi')).resolves.toBe(true);
    await expect(isServedNetwork('HOODI')).resolves.toBe(true);
  });

  it('rejects a network the indexer does not serve', async () => {
    global.fetch = vi.fn().mockResolvedValue(networksResponse(['mainnet', 'sepolia'])) as
      unknown as typeof fetch;

    await expect(isServedNetwork('holesky')).resolves.toBe(false);
    // Any single path segment reaches this route, including page-looking ones.
    await expect(isServedNetwork('blockz')).resolves.toBe(false);
  });

  it('rejects anything that is not shaped like a network, without a request', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(isServedNetwork('mainnet&limit=1')).resolves.toBe(false);
    await expect(isServedNetwork('../etc/passwd')).resolves.toBe(false);
    await expect(isServedNetwork('')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves the hardcoded networks without consulting the list', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(isServedNetwork('mainnet')).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets a network through when the list cannot be fetched', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('indexer down')) as unknown as typeof fetch;

    // A real network must not 404 because the API blinked.
    await expect(isServedNetwork('hoodi')).resolves.toBe(true);
  });
});
