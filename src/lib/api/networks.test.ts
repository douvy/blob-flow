import { getNetworks } from './networks';

const originalFetch = global.fetch;

describe('api/networks', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls the networks endpoint without a network param', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ chain_id: 1, name: 'mainnet' }],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getNetworks();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/networks');
    expect(calledUrl).not.toContain('network=');
    expect(result.success).toBe(true);
    expect(result.data?.[0].name).toBe('mainnet');
  });
});
