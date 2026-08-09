import { OG_CARD_CACHE_CONTROL } from '@/lib/og/card';
import { GET as blockCard } from './block/[number]/route';
import { GET as userCard } from './user/[address]/route';
import { GET as homeCard } from './home/route';
import { GET as chartCard } from './chart/[chart]/route';
import { GET as statCard } from './card/route';

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const originalFetch = global.fetch;

// ImageResponse rasterizes with satori, which is slow and needs the font
// files; these tests are about the routes' guards, so the render is stubbed.
vi.mock('next/og', () => ({
    ImageResponse: class {
        status = 200;
        headers: Headers;
        constructor(_element: unknown, options?: { headers?: Record<string, string> }) {
            this.headers = new Headers(options?.headers);
        }
    },
}));

vi.mock('@/lib/og/card', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/og/card')>()),
    loadOgFonts: vi.fn(async () => undefined),
    loadOgLogo: vi.fn(async () => null),
}));

function request(url: string): Request {
    return new Request(`https://blobflow.com${url}`);
}

/** The indexer answering with a usable body for any endpoint. */
function mockBackend(data: unknown, status = 200) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ success: true, data }),
    }) as unknown as typeof fetch;
}

describe('stat card routes', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mockBackend({
            block_number: 21834102,
            blob_count: 3,
            address: ADDRESS,
            current_base_fee_gwei: '1.5',
            predicted_next_fee_gwei: '1.6',
            market_pressure: { percent_recent_blocks_at_max_blobs: 10 },
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('renders a card with the shared cache header', async () => {
        const response = await homeCard(request('/api/og/home?network=mainnet&range=7d'));

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    // Each distinct URL is its own rasterization and CDN entry, so URLs that
    // differ only in noise must not each mint a card.
    it('refuses query keys it does not understand', async () => {
        const response = await homeCard(request('/api/og/home?network=mainnet&nonce=abc'));

        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    it('refuses non-canonical block numbers and addresses', async () => {
        const paddedBlock = await blockCard(request('/api/og/block/0000123'), {
            params: Promise.resolve({ number: '0000123' }),
        });
        expect(paddedBlock.status).toBe(404);

        const hugeBlock = await blockCard(request(`/api/og/block/${'9'.repeat(400)}`), {
            params: Promise.resolve({ number: '9'.repeat(400) }),
        });
        expect(hugeBlock.status).toBe(404);

        const mixedCase = await userCard(request(`/api/og/user/${ADDRESS.toUpperCase()}`), {
            params: Promise.resolve({ address: ADDRESS.toUpperCase() }),
        });
        expect(mixedCase.status).toBe(404);
    });

    it('404s a block or sender the indexer says does not exist', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({}),
        }) as unknown as typeof fetch;

        const block = await blockCard(request('/api/og/block/21834102'), {
            params: Promise.resolve({ number: '21834102' }),
        });
        expect(block.status).toBe(404);

        const user = await userCard(request(`/api/og/user/${ADDRESS}`), {
            params: Promise.resolve({ address: ADDRESS }),
        });
        expect(user.status).toBe(404);
    });

    // An outage says nothing about whether the block exists, so caching a 404
    // for it would teach crawlers that a real page has no card.
    it('still renders a card when the indexer is unreachable', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;

        const block = await blockCard(request('/api/og/block/21834102'), {
            params: Promise.resolve({ number: '21834102' }),
        });
        expect(block.status).toBe(200);

        const user = await userCard(request(`/api/og/user/${ADDRESS}`), {
            params: Promise.resolve({ address: ADDRESS }),
        });
        expect(user.status).toBe(200);

        const home = await homeCard(request('/api/og/home'));
        expect(home.status).toBe(200);
    });

    it('still renders a card when the indexer returns a malformed body', async () => {
        mockBackend({});

        const home = await homeCard(request('/api/og/home'));

        expect(home.status).toBe(200);
    });
});

// The chart and stat cards each rasterize and fetch on a cache miss, so a
// query that differs only in noise must not reach that work.
describe('chart card route', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mockBackend({ points: [] });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    function chart(search: string) {
        return chartCard(request(`/api/og/chart/base-fee${search}`), {
            params: Promise.resolve({ chart: 'base-fee' }),
        });
    }

    it('renders a card for the canonical query', async () => {
        const response = await chart('?range=7d&network=mainnet');

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    it('refuses query keys it does not understand', async () => {
        const response = await chart('?range=7d&junk=nonce');

        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    it('refuses a repeated key, which would be two spellings of one card', async () => {
        const response = await chart('?range=1h&range=7d');

        expect(response.status).toBe(404);
    });

    it('refuses a chart slug it does not have a page for', async () => {
        const response = await chartCard(request('/api/og/chart/nope'), {
            params: Promise.resolve({ chart: 'nope' }),
        });

        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });
});

describe('stat card route', () => {
    // The whole card lives in the query string, so this route understands two
    // keys beyond the shared network and range.
    const CANONICAL = '?entity=base&range=30d&metrics=blob-share,eth-spent&network=mainnet';

    beforeEach(() => {
        vi.restoreAllMocks();
        mockBackend({ points: [], current_base_fee_gwei: '1.5' });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('renders a card for the canonical query', async () => {
        const response = await statCard(request(`/api/og/card${CANONICAL}`));

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    it('refuses query keys it does not understand', async () => {
        const response = await statCard(request(`/api/og/card${CANONICAL}&junk=nonce`));

        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toBe(OG_CARD_CACHE_CONTROL);
    });

    it('refuses a repeated key, which would be two spellings of one card', async () => {
        const response = await statCard(request('/api/og/card?entity=base&entity=optimism'));

        expect(response.status).toBe(404);
    });
});
