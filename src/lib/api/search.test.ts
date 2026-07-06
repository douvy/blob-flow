import { search } from './search';

const originalFetch = global.fetch;

describe('api/search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves typed matches and URL-encodes the query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { type: 'rollup', name: 'Base', addresses: ['0x5050f69a9786f081509234f1a7f4684b5e5b76c9'] },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const matches = await search('ba se', 'mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/search?q=ba%20se&network=mainnet'),
      expect.any(Object)
    );
    expect(matches).toEqual([
      { type: 'rollup', name: 'Base', addresses: ['0x5050f69a9786f081509234f1a7f4684b5e5b76c9'] },
    ]);
  });

  it('returns an empty array when the backend reports no matches', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    }) as unknown as typeof fetch;

    await expect(search('nomatch')).resolves.toEqual([]);
  });
});
