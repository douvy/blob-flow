import {
  ANALYTICS_HOST_URL,
  ANALYTICS_SCRIPT_PATH,
  beforeSend,
  resetPageviewState,
  trackEvent,
  trackedDomain,
} from './analytics';

describe('tracker paths', () => {
  it('serves the script and the collection endpoint from this origin', () => {
    expect(ANALYTICS_SCRIPT_PATH).toBe('/api/stats/script.js');
    // The tracker appends its collection path to this value, so it has to be
    // the proxy base and it has to stay root-relative.
    expect(ANALYTICS_HOST_URL).toBe('/api/stats');
    expect(ANALYTICS_HOST_URL.startsWith('/')).toBe(true);
    expect(ANALYTICS_HOST_URL.endsWith('/')).toBe(false);
  });
});

describe('trackEvent', () => {
  beforeEach(() => {
    delete window.umami;
  });

  it('does nothing when the tracker never loaded', () => {
    expect(() => trackEvent('network-switch', { from: 'mainnet', to: 'sepolia' })).not.toThrow();
  });

  it('forwards the event name and properties to the tracker', () => {
    const track = vi.fn();
    window.umami = { track };

    trackEvent('network-switch', { from: 'mainnet', to: 'sepolia' });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('network-switch', { from: 'mainnet', to: 'sepolia' });
  });

  it('ignores a tracker whose track is not callable', () => {
    // A blocker or an unrelated global can leave a stub on window.
    window.umami = {} as unknown as typeof window.umami;

    expect(() => trackEvent('time-range-change', { range: '7d', previous: '1h' })).not.toThrow();
  });

  it('swallows a throwing tracker so the interaction still completes', () => {
    window.umami = {
      track: () => {
        throw new Error('beacon failed');
      },
    };

    expect(() => trackEvent('chart-image', { chart: 'base-fee', outcome: 'copied' })).not.toThrow();
  });
});

describe('beforeSend', () => {
  const pageview = (url: string) => ({ url, title: 'BlobFlow' });

  beforeEach(() => {
    resetPageviewState();
  });

  it('reports the first pageview', () => {
    expect(beforeSend('event', pageview('https://blobflow.com/?range=1h'))).toBeTruthy();
  });

  it('drops the pageview a time range toggle produces', () => {
    beforeSend('event', pageview('https://blobflow.com/?range=1h'));

    expect(beforeSend('event', pageview('https://blobflow.com/?range=7d'))).toBeUndefined();
    expect(beforeSend('event', pageview('https://blobflow.com/?range=30d'))).toBeUndefined();
  });

  it('reports a navigation to another page', () => {
    beforeSend('event', pageview('https://blobflow.com/?range=1h'));

    expect(beforeSend('event', pageview('https://blobflow.com/blocks'))).toBeTruthy();
    // Returning to a page already seen is a real pageview, not a range toggle.
    expect(beforeSend('event', pageview('https://blobflow.com/?range=7d'))).toBeTruthy();
  });

  it('keeps query parameters other than the range apart', () => {
    beforeSend('event', pageview('https://blobflow.com/?range=1h'));

    // Campaign tags decide attribution, so they must never be collapsed away.
    expect(
      beforeSend('event', pageview('https://blobflow.com/?range=1h&utm_source=x'))
    ).toBeTruthy();
  });

  it('passes custom events through even on an unchanged page', () => {
    beforeSend('event', pageview('https://blobflow.com/?range=1h'));

    const event = { url: 'https://blobflow.com/?range=7d', name: 'time-range-change' };
    expect(beforeSend('event', event)).toBe(event);
  });

  it('passes through payloads it does not recognize', () => {
    const performance = { url: 'https://blobflow.com/' };
    expect(beforeSend('performance', performance)).toBe(performance);

    const malformed = { url: 'not a url' };
    expect(beforeSend('event', malformed)).toBe(malformed);
    expect(beforeSend('event', {})).toEqual({});
  });
});

describe('trackedDomain', () => {
  it('returns the canonical hostname', () => {
    expect(trackedDomain('https://blobflow.com')).toBe('blobflow.com');
    expect(trackedDomain('https://blobflow.com/charts?range=7d')).toBe('blobflow.com');
  });

  it('leaves the attribute off for local development', () => {
    expect(trackedDomain('http://localhost:3000')).toBeUndefined();
    expect(trackedDomain('http://127.0.0.1:3000')).toBeUndefined();
  });

  it('leaves the attribute off for an unparseable site url', () => {
    expect(trackedDomain('')).toBeUndefined();
    expect(trackedDomain('not a url')).toBeUndefined();
  });
});
