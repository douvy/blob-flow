import { NETWORKS } from '@/constants';
import {
    OG_FETCH_TIMEOUT_MS,
    fetchOgApi,
    getBlockOgData,
    getHomeOgData,
    getUserOgData,
    isBlobSenderAddress,
} from './data';

const originalFetch = global.fetch;
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

function mockJson(payload: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

const PRICING = {
    current_base_fee_gwei: '1.5',
    predicted_next_fee_gwei: '1.6',
    market_pressure: { percent_recent_blocks_at_max_blobs: 35 },
};

describe('og/data', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.useRealTimers();
    });

    it('returns the unwrapped data payload on success', async () => {
        const fetchMock = mockJson({ success: true, data: { total_blobs: 42 } });

        await expect(fetchOgApi<{ total_blobs: number }>('/stats')).resolves.toEqual({
            status: 'ok',
            data: { total_blobs: 42 },
        });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/stats?network=mainnet'),
            expect.objectContaining({ cache: 'no-store' })
        );
    });

    it('appends the network param with & when the endpoint already has a query', async () => {
        const fetchMock = mockJson({ success: true, data: {} });

        await fetchOgApi('/blob/pricing?blocks=20', NETWORKS.SEPOLIA);

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/blob/pricing?blocks=20&network=sepolia'),
            expect.anything()
        );
    });

    // The two failure kinds mean different things to a crawler: "missing" is a
    // property of the URL and should 404, "unavailable" is transient and must
    // still render a card.
    it('reports a backend 404 as missing, not as an outage', async () => {
        mockJson({}, 404);

        await expect(fetchOgApi('/block/1')).resolves.toEqual({ status: 'missing' });
    });

    it('reports 5xx, transport failure, and unparseable JSON as unavailable', async () => {
        mockJson({}, 503);
        await expect(fetchOgApi('/stats')).resolves.toEqual({ status: 'unavailable' });

        global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
        await expect(fetchOgApi('/stats')).resolves.toEqual({ status: 'unavailable' });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('bad json');
            },
        }) as unknown as typeof fetch;
        await expect(fetchOgApi('/stats')).resolves.toEqual({ status: 'unavailable' });
    });

    it('treats a success payload with no data as missing', async () => {
        mockJson({ success: true });

        await expect(fetchOgApi('/block/1')).resolves.toEqual({ status: 'missing' });
    });

    it('treats a payload that fails its shape check as unavailable', async () => {
        mockJson({ success: true, data: { unexpected: true } });

        const isNumbered = (value: unknown): value is { id: number } =>
            typeof (value as { id?: unknown })?.id === 'number';

        await expect(fetchOgApi('/stats', NETWORKS.MAINNET, isNumbered)).resolves.toEqual({
            status: 'unavailable',
        });
    });

    it('gives up on a hanging backend rather than holding the crawler', async () => {
        vi.useFakeTimers();
        global.fetch = vi.fn(
            (_url: string, init?: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () =>
                        reject(new DOMException('aborted', 'AbortError'))
                    );
                })
        ) as unknown as typeof fetch;

        const pending = fetchOgApi('/stats');
        await vi.advanceTimersByTimeAsync(OG_FETCH_TIMEOUT_MS + 1);

        await expect(pending).resolves.toEqual({ status: 'unavailable' });
    });

    it('scopes the dashboard reads to the requested network and range', async () => {
        const fetchMock = mockJson({ success: true, data: PRICING });

        await getHomeOgData({ network: NETWORKS.SEPOLIA, range: '30d' });

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('/blob/pricing?blocks=20&network=sepolia'),
            expect.anything()
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining(
                '/charts/attribution-usage?range=30d&granularity=auto&network=sepolia'
            ),
            expect.anything()
        );
    });

    it('drops a structurally unusable dashboard payload instead of passing it on', async () => {
        // A 200 whose body is missing the fields the card reads would throw
        // inside the builder; the card must degrade to its fallback instead.
        mockJson({ success: true, data: {} });

        await expect(getHomeOgData()).resolves.toEqual({ pricing: null, attribution: null });
    });

    it('scopes block and sender lookups to the requested network', async () => {
        const fetchMock = mockJson({
            success: true,
            data: { block_number: 21834102, blob_count: 3, address: ADDRESS },
        });

        await getBlockOgData(21834102, NETWORKS.SEPOLIA);
        await getUserOgData(ADDRESS, NETWORKS.SEPOLIA);

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('/block/21834102?network=sepolia'),
            expect.anything()
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining(`/users/${ADDRESS}?network=sepolia`),
            expect.anything()
        );
    });

    // A card labels itself from the request, so rendering a mismatched
    // response would attribute one block's or sender's numbers to another.
    it('refuses a response that describes a different block or sender', async () => {
        mockJson({ success: true, data: { block_number: 999, blob_count: 3 } });
        await expect(getBlockOgData(21834102)).resolves.toEqual({ status: 'unavailable' });

        mockJson({
            success: true,
            data: { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', blob_count: 1 },
        });
        await expect(getUserOgData(ADDRESS)).resolves.toEqual({ status: 'unavailable' });
    });

    it('accepts a sender response that differs only in address casing', async () => {
        mockJson({ success: true, data: { address: ADDRESS.toUpperCase(), blob_count: 1 } });

        await expect(getUserOgData(ADDRESS)).resolves.toMatchObject({ status: 'ok' });
    });

    // These values come straight from the URL, so a malformed one must never
    // reach the backend.
    it('rejects malformed addresses and block numbers without hitting the API', async () => {
        const fetchMock = vi.fn();
        global.fetch = fetchMock as unknown as typeof fetch;

        expect(isBlobSenderAddress('not-an-address')).toBe(false);
        expect(isBlobSenderAddress(ADDRESS)).toBe(true);

        await expect(getUserOgData('not-an-address')).resolves.toEqual({ status: 'missing' });
        await expect(getBlockOgData(NaN)).resolves.toEqual({ status: 'missing' });
        await expect(getBlockOgData(-5)).resolves.toEqual({ status: 'missing' });
        await expect(getBlockOgData(1.5)).resolves.toEqual({ status: 'missing' });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
