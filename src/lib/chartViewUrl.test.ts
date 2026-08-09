import { buildChartViewHref, buildChartViewUrl, isChartViewPath } from './chartViewUrl';

describe('isChartViewPath', () => {
  it('matches the dashboard and chart detail pages', () => {
    expect(isChartViewPath('/')).toBe(true);
    expect(isChartViewPath('/charts/base-fee')).toBe(true);
    expect(isChartViewPath('/charts/rolling-market-stats')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isChartViewPath('/blocks')).toBe(false);
    expect(isChartViewPath('/records')).toBe(false);
    // Guards against a prefix match swallowing an unrelated route.
    expect(isChartViewPath('/chartsy')).toBe(false);
    expect(isChartViewPath('')).toBe(false);
    expect(isChartViewPath(null)).toBe(false);
    expect(isChartViewPath(undefined)).toBe(false);
  });
});

describe('buildChartViewUrl', () => {
  it('writes the range onto a bare path', () => {
    expect(buildChartViewUrl('/charts/base-fee', '', '7d')).toBe('/charts/base-fee?range=7d');
  });

  it('overrides an existing range and preserves unrelated params', () => {
    const url = buildChartViewUrl('/charts/base-fee', '?range=1h&foo=bar', '7d');
    const params = new URLSearchParams(url.split('?')[1]);

    expect(url.split('?')[0]).toBe('/charts/base-fee');
    expect(params.get('range')).toBe('7d');
    expect(params.get('foo')).toBe('bar');
  });

  it('keeps the network segment when the path carries one', () => {
    // The header passes the raw pathname so a rewrite cannot drop the network.
    expect(buildChartViewUrl('/sepolia/charts/base-fee', '', '24h')).toBe(
      '/sepolia/charts/base-fee?range=24h'
    );
  });

  it('appends the hash after the query', () => {
    expect(buildChartViewUrl('/', '', '7d', '#data-trends')).toBe('/?range=7d#data-trends');
  });
});

describe('buildChartViewHref', () => {
  it('writes the range onto an internal href', () => {
    expect(buildChartViewHref('/charts/blob-usage', '7d')).toBe('/charts/blob-usage?range=7d');
  });

  it('keeps hash fragments after the query', () => {
    expect(buildChartViewHref('/#data-trends', '24h')).toBe('/?range=24h#data-trends');
  });

  it('overrides a range already present in the href', () => {
    expect(buildChartViewHref('/charts/blob-usage?range=1h&foo=bar', '7d')).toBe(
      '/charts/blob-usage?range=7d&foo=bar'
    );
  });
});
