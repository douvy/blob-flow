import { getStatus } from './status';

const originalFetch = global.fetch;

describe('api/status', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls status endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { uptime: '1h' } }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await getStatus('mainnet');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/status?network=mainnet'),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
  });
});
