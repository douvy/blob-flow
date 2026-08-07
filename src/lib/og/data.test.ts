import { fetchOgApi, getAttributionOgChart, getBlockOgData, getUserOgData } from './data';

const originalFetch = global.fetch;

describe('og/data', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('returns the unwrapped data payload on success', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: { total_blobs: 42 } }),
        });
        global.fetch = fetchMock as unknown as typeof fetch;

        const data = await fetchOgApi<{ total_blobs: number }>('/stats');

        expect(data).toEqual({ total_blobs: 42 });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/stats?network=mainnet'),
            expect.objectContaining({ cache: 'no-store' })
        );
    });

    it('appends the network param with & when the endpoint has a query', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: {} }),
        });
        global.fetch = fetchMock as unknown as typeof fetch;

        await fetchOgApi('/blob/pricing?blocks=20');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/blob/pricing?blocks=20&network=mainnet'),
            expect.anything()
        );
    });

    it('returns null on HTTP errors instead of throwing', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 503,
            json: async () => ({}),
        }) as unknown as typeof fetch;

        await expect(fetchOgApi('/stats')).resolves.toBeNull();
    });

    it('returns null when the payload reports failure or has no data', async () => {
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: false, error: 'nope' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            }) as unknown as typeof fetch;

        await expect(fetchOgApi('/stats')).resolves.toBeNull();
        await expect(fetchOgApi('/stats')).resolves.toBeNull();
    });

    it('returns null on network failures and malformed JSON', async () => {
        global.fetch = vi
            .fn()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => {
                    throw new SyntaxError('bad json');
                },
            }) as unknown as typeof fetch;

        await expect(fetchOgApi('/stats')).resolves.toBeNull();
        await expect(fetchOgApi('/stats')).resolves.toBeNull();
    });

    it('passes the requested range through to chart endpoints', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, data: {} }),
        });
        global.fetch = fetchMock as unknown as typeof fetch;

        await getAttributionOgChart('30d');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/charts/attribution-usage?range=30d'),
            expect.anything()
        );
    });

    it('rejects malformed user addresses without hitting the API', async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(getUserOgData('not-an-address')).resolves.toBeNull();
        await expect(getUserOgData('0x123')).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects invalid block numbers without hitting the API', async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock as unknown as typeof fetch;

        await expect(getBlockOgData(NaN)).resolves.toBeNull();
        await expect(getBlockOgData(-5)).resolves.toBeNull();
        await expect(getBlockOgData(1.5)).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
