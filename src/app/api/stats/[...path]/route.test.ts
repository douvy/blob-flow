import { GET, POST } from './route';

const UPSTREAM = 'http://umami.internal:3000';

/** Route params arrive as a promise in App Router handlers. */
function ctx(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function collectRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://blobflow.test/api/stats/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-umami-website-id': 'site-1',
      ...headers,
    },
    body: JSON.stringify({ type: 'event', payload: { website: 'site-1' } }),
  });
}

describe('/api/stats proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('when UMAMI_URL is unset', () => {
    it('404s the script without reaching the network', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      const response = await GET(
        new Request('http://blobflow.test/api/stats/script.js'),
        ctx('script.js')
      );

      expect(response.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('404s the collection endpoint', async () => {
      const response = await POST(collectRequest(), ctx('api', 'send'));
      expect(response.status).toBe(404);
    });
  });

  describe('GET script.js', () => {
    beforeEach(() => {
      vi.stubEnv('UMAMI_URL', `${UPSTREAM}/`);
    });

    it('relays the tracker from the configured instance and caches it', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('!function(){}();', {
          status: 200,
          headers: { 'Content-Type': 'text/javascript' },
        })
      );

      const response = await GET(
        new Request('http://blobflow.test/api/stats/script.js', {
          headers: { 'user-agent': 'Mozilla/5.0' },
        }),
        ctx('script.js')
      );

      // The trailing slash on UMAMI_URL must not produce a doubled path.
      expect(fetchMock.mock.calls[0][0]).toBe(`${UPSTREAM}/script.js`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('!function(){}();');
      expect(response.headers.get('Content-Type')).toBe('text/javascript');
      expect(response.headers.get('Cache-Control')).toContain('max-age=3600');
    });

    it('refuses any path other than the tracker script', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      for (const path of [['api', 'websites'], ['..', 'etc', 'passwd'], []]) {
        const response = await GET(
          new Request('http://blobflow.test/api/stats/x'),
          ctx(...path)
        );
        expect(response.status).toBe(404);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('502s when the instance is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const response = await GET(
        new Request('http://blobflow.test/api/stats/script.js'),
        ctx('script.js')
      );

      expect(response.status).toBe(502);
    });

    it('502s when the instance answers with an error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));

      const response = await GET(
        new Request('http://blobflow.test/api/stats/script.js'),
        ctx('script.js')
      );

      expect(response.status).toBe(502);
    });
  });

  describe('POST api/send', () => {
    beforeEach(() => {
      vi.stubEnv('UMAMI_URL', UPSTREAM);
    });

    it('relays the beacon body and the headers the tracker depends on', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      const response = await POST(
        collectRequest({
          'user-agent': 'Mozilla/5.0',
          'accept-language': 'en-GB,en;q=0.9',
          'x-umami-cache': 'cache-token',
          'x-forwarded-for': '203.0.113.7',
        }),
        ctx('api', 'send')
      );

      expect(fetchMock.mock.calls[0][0]).toBe(`${UPSTREAM}/api/send`);
      const init = fetchMock.mock.calls[0][1]!;
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        type: 'event',
        payload: { website: 'site-1' },
      });

      const forwarded = new Headers(init.headers);
      // Umami derives browser, device, and language from these, and reads the
      // visitor's address from the forwarded-for chain.
      expect(forwarded.get('user-agent')).toBe('Mozilla/5.0');
      expect(forwarded.get('accept-language')).toBe('en-GB,en;q=0.9');
      expect(forwarded.get('x-forwarded-for')).toBe('203.0.113.7');
      expect(forwarded.get('x-umami-website-id')).toBe('site-1');
      expect(forwarded.get('x-umami-cache')).toBe('cache-token');

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('does not forward cookies to the analytics instance', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await POST(collectRequest({ cookie: 'session=secret' }), ctx('api', 'send'));

      const forwarded = new Headers(fetchMock.mock.calls[0][1]!.headers);
      expect(forwarded.get('cookie')).toBeNull();
    });

    it('refuses any path other than the collection endpoint', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      const response = await POST(collectRequest(), ctx('api', 'websites'));

      expect(response.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('502s when the instance is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const response = await POST(collectRequest(), ctx('api', 'send'));

      expect(response.status).toBe(502);
    });

    it('passes an upstream rejection through unchanged', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('website not found', { status: 400 })
      );

      const response = await POST(collectRequest(), ctx('api', 'send'));

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('website not found');
    });
  });
});
