import {
  buildChartViewHref,
  buildChartViewUrl,
  buildNetworkChangeUrl,
  isChartViewPath,
  parseChartNetworkParam,
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

describe('parseChartNetworkParam', () => {
  it('accepts well-formed network identifiers', () => {
    expect(parseChartNetworkParam('mainnet')).toBe('mainnet');
    expect(parseChartNetworkParam('op-sepolia')).toBe('op-sepolia');
    expect(parseChartNetworkParam('net_1')).toBe('net_1');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(parseChartNetworkParam('Sepolia')).toBe('sepolia');
    expect(parseChartNetworkParam(' hoodi ')).toBe('hoodi');
  });

  it('rejects malformed values', () => {
    expect(parseChartNetworkParam('bad name')).toBeNull();
    expect(parseChartNetworkParam('foo/bar')).toBeNull();
    expect(parseChartNetworkParam('-mainnet')).toBeNull();
    expect(parseChartNetworkParam('')).toBeNull();
    expect(parseChartNetworkParam('   ')).toBeNull();
    expect(parseChartNetworkParam(null)).toBeNull();
    expect(parseChartNetworkParam(undefined)).toBeNull();
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
  it('writes both params from an empty query string', () => {
    expect(
      buildChartViewUrl('/charts/base-fee', '', { range: '7d', network: 'mainnet' })
    ).toBe('/charts/base-fee?range=7d&network=mainnet');
  });

  it('overrides existing view params and preserves unrelated ones', () => {
    const url = buildChartViewUrl('/charts/base-fee', '?range=1h&foo=bar', {
      range: '7d',
      network: 'sepolia',
    });
    const [pathname, search] = url.split('?');
    const params = new URLSearchParams(search);

    expect(pathname).toBe('/charts/base-fee');
    expect(params.get('range')).toBe('7d');
    expect(params.get('network')).toBe('sepolia');
    expect(params.get('foo')).toBe('bar');
  });

  it('appends the hash after the query', () => {
    expect(
      buildChartViewUrl('/', '', { range: '7d', network: 'mainnet' }, '#data-trends')
    ).toBe('/?range=7d&network=mainnet#data-trends');
  });
});

describe('buildNetworkChangeUrl', () => {
  it('writes both view params on chart views', () => {
    const url = buildNetworkChangeUrl(
      { pathname: '/charts/base-fee', search: '', hash: '' },
      { range: '7d', network: 'sepolia' }
    );
    expect(url).toBe('/charts/base-fee?range=7d&network=sepolia');
  });

  it('overrides a stale range param with the in-memory range', () => {
    // The current search string can predate an uncommitted router.replace;
    // the state value wins.
    const url = buildNetworkChangeUrl(
      { pathname: '/charts/base-fee', search: '?range=1h', hash: '' },
      { range: '7d', network: 'sepolia' }
    );
    expect(url).toBe('/charts/base-fee?range=7d&network=sepolia');
  });

  it('preserves the hash on the dashboard', () => {
    const url = buildNetworkChangeUrl(
      { pathname: '/', search: '', hash: '#data-trends' },
      { range: '24h', network: 'sepolia' }
    );
    expect(url).toBe('/?range=24h&network=sepolia#data-trends');
  });

  it('updates only the stale params present off the chart views', () => {
    expect(
      buildNetworkChangeUrl(
        { pathname: '/blocks', search: '?network=hoodi', hash: '' },
        { range: '7d', network: 'sepolia' }
      )
    ).toBe('/blocks?network=sepolia');
    expect(
      buildNetworkChangeUrl(
        { pathname: '/blocks', search: '?range=1h', hash: '' },
        { range: '7d', network: 'sepolia' }
      )
    ).toBe('/blocks?range=7d');
  });

  it('returns null when the URL needs no change', () => {
    expect(
      buildNetworkChangeUrl(
        { pathname: '/blocks', search: '', hash: '' },
        { range: '7d', network: 'sepolia' }
      )
    ).toBeNull();
  });
});

describe('buildChartViewHref', () => {
  it('writes the resolved view onto an internal href', () => {
    expect(buildChartViewHref('/charts/blob-usage', { range: '7d', network: 'sepolia' })).toBe(
      '/charts/blob-usage?range=7d&network=sepolia'
    );
  });

  it('keeps hash fragments after the query', () => {
    expect(buildChartViewHref('/#data-trends', { range: '24h', network: 'mainnet' })).toBe(
      '/?range=24h&network=mainnet#data-trends'
    );
  });

  it('overrides params already present in the href', () => {
    expect(
      buildChartViewHref('/charts/blob-usage?range=1h&foo=bar', {
        range: '7d',
        network: 'sepolia',
      })
    ).toBe('/charts/blob-usage?range=7d&foo=bar&network=sepolia');
  });
});
