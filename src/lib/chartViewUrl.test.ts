import {
  buildChartViewHref,
  buildChartViewUrl,
  isChartViewPath,
  parseChartRangeParam,
} from './chartViewUrl';

describe('parseChartRangeParam', () => {
  it('accepts every range the chart UI supports', () => {
    expect(parseChartRangeParam('1h')).toBe('1h');
    expect(parseChartRangeParam('24h')).toBe('24h');
    expect(parseChartRangeParam('7d')).toBe('7d');
    expect(parseChartRangeParam('30d')).toBe('30d');
  });

  it('caps the backend-only all range to 30d', () => {
    // 'all' is a valid BackendChartRange, but the blob-market endpoint rejects
    // it, so the charts show the widest range they can actually request.
    expect(parseChartRangeParam('all')).toBe('30d');
    expect(parseChartRangeParam('ALL')).toBe('30d');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(parseChartRangeParam('7D')).toBe('7d');
    expect(parseChartRangeParam(' 24h ')).toBe('24h');
  });

  it('rejects unknown values', () => {
    expect(parseChartRangeParam('2w')).toBeNull();
    expect(parseChartRangeParam('1 h')).toBeNull();
    expect(parseChartRangeParam('7dd')).toBeNull();
    expect(parseChartRangeParam('')).toBeNull();
    expect(parseChartRangeParam(null)).toBeNull();
    expect(parseChartRangeParam(undefined)).toBeNull();
  });
});

describe('isChartViewPath', () => {
  it('matches the dashboard and chart detail pages', () => {
    expect(isChartViewPath('/')).toBe(true);
    expect(isChartViewPath('/charts/base-fee')).toBe(true);
    expect(isChartViewPath('/charts/rolling-market-stats')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isChartViewPath('/blocks')).toBe(false);
    expect(isChartViewPath('/chartsy')).toBe(false);
    expect(isChartViewPath('')).toBe(false);
    expect(isChartViewPath(null)).toBe(false);
    expect(isChartViewPath(undefined)).toBe(false);
  });
});

describe('buildChartViewUrl', () => {
  it('writes the range from an empty query string', () => {
    expect(buildChartViewUrl('/charts/base-fee', '', '7d')).toBe('/charts/base-fee?range=7d');
  });

  it('overrides an existing range and preserves unrelated params', () => {
    const url = buildChartViewUrl('/charts/base-fee', '?range=1h&foo=bar', '7d');
    const [pathname, search] = url.split('?');
    const params = new URLSearchParams(search);

    expect(pathname).toBe('/charts/base-fee');
    expect(params.get('range')).toBe('7d');
    expect(params.get('foo')).toBe('bar');
  });

  it('keeps the network segment already in the path', () => {
    // The caller passes the un-stripped pathname so the rewrite cannot drop
    // the network the page is scoped to.
    expect(buildChartViewUrl('/sepolia/charts/base-fee', '', '7d')).toBe(
      '/sepolia/charts/base-fee?range=7d'
    );
  });

  it('appends the hash after the query', () => {
    expect(buildChartViewUrl('/', '', '7d', '#data-trends')).toBe('/?range=7d#data-trends');
  });
});

describe('buildChartViewHref', () => {
  it('writes the resolved range onto an internal href', () => {
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
