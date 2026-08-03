import {
  appendChartViewParams,
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
});

describe('buildNetworkChangeUrl', () => {
  it('writes the network param on chart views', () => {
    const url = buildNetworkChangeUrl(
      { pathname: '/charts/base-fee', search: '?range=7d', hash: '' },
      'sepolia'
    );
    expect(url).toBe('/charts/base-fee?range=7d&network=sepolia');
  });

  it('preserves the hash on the dashboard', () => {
    const url = buildNetworkChangeUrl(
      { pathname: '/', search: '', hash: '#data-trends' },
      'sepolia'
    );
    expect(url).toBe('/?network=sepolia#data-trends');
  });

  it('updates a stale param even off the chart views', () => {
    const url = buildNetworkChangeUrl(
      { pathname: '/blocks', search: '?network=hoodi', hash: '' },
      'sepolia'
    );
    expect(url).toBe('/blocks?network=sepolia');
  });

  it('returns null when the URL needs no change', () => {
    expect(
      buildNetworkChangeUrl({ pathname: '/blocks', search: '', hash: '' }, 'sepolia')
    ).toBeNull();
  });
});

describe('appendChartViewParams', () => {
  it('carries valid view params onto an internal href', () => {
    expect(appendChartViewParams('/charts/blob-usage', 'range=7d&network=sepolia')).toBe(
      '/charts/blob-usage?range=7d&network=sepolia'
    );
  });

  it('drops invalid params instead of propagating them', () => {
    expect(appendChartViewParams('/charts/blob-usage', 'range=2w&network=bad name')).toBe(
      '/charts/blob-usage'
    );
  });

  it('carries the valid param when the other is invalid', () => {
    expect(appendChartViewParams('/charts/blob-usage', 'range=24h&network=bad name')).toBe(
      '/charts/blob-usage?range=24h'
    );
  });

  it('normalizes the capped all range', () => {
    expect(appendChartViewParams('/charts/blob-usage', 'range=all')).toBe(
      '/charts/blob-usage?range=30d'
    );
  });

  it('keeps hash fragments after the query', () => {
    expect(appendChartViewParams('/#data-trends', 'range=24h')).toBe('/?range=24h#data-trends');
  });

  it('leaves the href alone without view params', () => {
    expect(appendChartViewParams('/charts/blob-usage', '')).toBe('/charts/blob-usage');
    expect(appendChartViewParams('/#data-trends', 'foo=1')).toBe('/#data-trends');
  });
});
