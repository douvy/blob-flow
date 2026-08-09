import { renderVsOgImage } from './vsOgImage';
import type { BackendAttributionUsageShare } from '@/types';

// satori is not needed to assert what the card reads; capture the element it
// would rasterize instead.
vi.mock('next/og', () => ({
  ImageResponse: vi.fn().mockImplementation(function ImageResponseMock() {
    return { ok: true };
  }),
}));

const originalFetch = global.fetch;

function share(overrides: Partial<BackendAttributionUsageShare> = {}): BackendAttributionUsageShare {
  return {
    key: 'base',
    name: 'Base',
    category: 'rollup',
    blob_count: 100,
    blob_share_percent: 40,
    total_cost_wei: '1000000000',
    spend_share_percent: 35,
    ...overrides,
  } as BackendAttributionUsageShare;
}

function sharesResponse(shares: BackendAttributionUsageShare[]) {
  return {
    ok: true,
    json: async () => ({ success: true, data: { points: [], summary: { shares } } }),
  };
}

function fetchedRanges(): string[] {
  return vi
    .mocked(global.fetch)
    .mock.calls.map((call) => new URL(call[0] as string).searchParams.get('range') ?? '');
}

describe('renderVsOgImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reads only the range the link asked for', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        sharesResponse([share(), share({ key: 'arbitrum_one', name: 'Arbitrum One' })])
      ) as unknown as typeof fetch;

    await renderVsOgImage('base', 'arbitrum', '1h');

    expect(fetchedRanges()).toEqual(['1h']);
  });

  it('does not widen to 30d when a contender was idle in the requested range', async () => {
    // The page does not widen either. A card that quietly reported a 30d
    // winner announced a matchup the page it points at says never happened.
    global.fetch = vi
      .fn()
      .mockResolvedValue(sharesResponse([share()])) as unknown as typeof fetch;

    await renderVsOgImage('base', 'arbitrum', '1h');

    expect(fetchedRanges()).toEqual(['1h']);
  });

  it('still renders when the backend cannot be reached', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;

    await expect(renderVsOgImage('base', 'arbitrum', '24h')).resolves.toBeDefined();
  });
});
