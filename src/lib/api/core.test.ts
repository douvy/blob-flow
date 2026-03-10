import { fetchApi, formatRelativeTime, truncateAddress } from './core';

const originalFetch = global.fetch;

describe('api/core', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('formats relative time for seconds, minutes, hours, and days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    expect(formatRelativeTime('2025-12-31T23:59:45.000Z')).toBe('15 sec ago');
    expect(formatRelativeTime('2025-12-31T23:58:00.000Z')).toBe('2 min ago');
    expect(formatRelativeTime('2025-12-31T22:00:00.000Z')).toBe('2 hours ago');
    expect(formatRelativeTime('2025-12-30T00:00:00.000Z')).toBe('2 days ago');
  });

  it('truncates long addresses and leaves short values unchanged', () => {
    expect(truncateAddress('0x1234567890abcdef')).toBe('0x1234...');
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });

  it('fetches data and appends network query parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await fetchApi<{ success: boolean }>('/stats?limit=1', 'mainnet', {
      headers: { Authorization: 'Bearer token' },
    });

    expect(data).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stats?limit=1&network=mainnet'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('retries on 5xx and eventually succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'server error' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    const request = fetchApi<{ ok: boolean }>('/status');
    await vi.advanceTimersByTimeAsync(1000);

    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a generic API failure for non-retryable errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'bad request',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchApi('/status')).rejects.toThrow('API request failed');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('throws a generic API failure when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchApi('/status')).rejects.toThrow('API request failed');
    expect(errorSpy).toHaveBeenCalled();
  });
});
