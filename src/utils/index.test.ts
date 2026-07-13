import {
  assignSeriesColors,
  attributionColorKey,
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatCostEthOrWei,
  formatDate,
  formatDuration,
  formatFeeHeadroom,
  formatGwei,
  formatNumber,
  formatPercent,
  formatUtilizationPercent,
  formatWeiToGwei,
  formatWeiToEth,
  formatWeiToReadable,
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionSuggestionUrl,
  getBlobCount,
  getNetworkIconSrc,
  parseSearchQuery,
  safeExplorerUrl,
  truncateAddress,
} from './index';

describe('utils', () => {
  it('formats numbers with locale separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('truncates addresses with default length', () => {
    expect(truncateAddress('0x1234567890abcdef')).toBe('0x1234...cdef');
    expect(truncateAddress('')).toBe('');
  });

  it('passes through http(s) explorer urls and rejects other schemes', () => {
    expect(safeExplorerUrl('https://etherscan.io/tx/0xabc')).toBe('https://etherscan.io/tx/0xabc');
    expect(safeExplorerUrl('http://localhost:3000/tx/0xabc')).toBe('http://localhost:3000/tx/0xabc');
    expect(safeExplorerUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExplorerUrl('data:text/html,hi')).toBeUndefined();
    expect(safeExplorerUrl('not a url')).toBeUndefined();
    expect(safeExplorerUrl('')).toBeUndefined();
    expect(safeExplorerUrl(undefined)).toBeUndefined();
  });

  it('maps known network names to local icons', () => {
    expect(getNetworkIconSrc('Arbitrum One')).toBe('/images/arbitrum.png');
    expect(getNetworkIconSrc('OP Mainnet')).toBe('/images/optimism.png');
    expect(getNetworkIconSrc('World Chain')).toBeNull();
  });

  it('formats dates in short US format', () => {
    const value = formatDate(new Date(2025, 0, 15));
    expect(value).toBe('Jan 15, 2025');
  });

  it('formats wei values with appropriate unit', () => {
    expect(formatWeiToReadable('500')).toBe('500 Wei');
    expect(formatWeiToReadable('4878649006.97818347')).toBe('4.87864900697818347 Gwei');
    expect(formatWeiToReadable('0.001')).toBe('0.001 Wei');
    expect(formatWeiToReadable('1000000000')).toBe('1 Gwei');
    expect(formatWeiToReadable('5014755072.74762611')).toBe('5.01475507274762611 Gwei');
    expect(formatWeiToReadable('1000000000000000000')).toBe('1 ETH');
  });

  it('formats wei values explicitly as ETH', () => {
    expect(formatWeiToEth('500000000000000')).toBe('0.0005 ETH');
    expect(formatWeiToEth('9065041362944', true)).toBe('0.000009 ETH');
    expect(formatWeiToEth('2203603226459001.927')).toBe('0.002203603226459001927 ETH');
  });

  it('formats decimal ETH costs and integer wei costs', () => {
    expect(formatCostEthOrWei('0.001')).toBe('0.001 ETH');
    expect(formatCostEthOrWei('1000000000')).toBe('1 Gwei');
    // Large wei costs render as ETH instead of tens of millions of Gwei.
    expect(formatCostEthOrWei('47031169918042112')).toBe('0.047031 ETH');
    expect(formatCostEthOrWei('1000000000000000000')).toBe('1 ETH');
    // Sub-Gwei costs stay in Wei.
    expect(formatCostEthOrWei('500')).toBe('500 Wei');
    // Decimal ETH costs are capped to a readable precision.
    expect(formatCostEthOrWei('0.047031169918042112')).toBe('0.047031 ETH');
    // Small decimal ETH costs fall back to Gwei/Wei instead of rounding to 0.
    expect(formatCostEthOrWei('0.0000001')).toBe('100 Gwei');
    expect(formatCostEthOrWei('0.000000000000000001')).toBe('1 Wei');
    // Equal costs render identically whether given as decimal ETH or integer wei.
    expect(formatCostEthOrWei('0.047031169918042112')).toBe(
      formatCostEthOrWei('47031169918042112')
    );
  });

  it('rejects invalid decimal values', () => {
    expect(() => formatWeiToReadable('abc')).toThrow('Invalid decimal value');
  });

  it('maps known attribution names to local images', () => {
    expect(getAttributionImageSrc('OP Mainnet')).toBe('/images/optimism.png');
    expect(getAttributionImageSrc('Arbitrum One')).toBe('/images/arbitrum.png');
    expect(getAttributionImageSrc('Taiko')).toBeNull();
    expect(getAttributionInitial('Taiko')).toBe('T');
  });

  it('builds a prefilled blob-list suggestion URL with a checksummed address', () => {
    const url = getAttributionSuggestionUrl(
      '0x000000633b68f5d8d3a86593ebb815b4663bcbe0',
      'mainnet'
    );
    expect(url?.startsWith('https://github.com/tirante-dev/blob-list/new/main?')).toBe(true);

    const params = new URL(url ?? '').searchParams;
    expect(params.get('filename')).toBe('entities/your-entity-id.yaml');

    const template = params.get('value') ?? '';
    expect(template).toContain('address: "0x000000633b68f5D8D3a86593ebB815b4663BCBe0"');
    expect(template).toContain('submission_chain: eip155-1');
    expect(template).toContain(
      'url: https://etherscan.io/address/0x000000633b68f5D8D3a86593ebB815b4663BCBe0'
    );
  });

  it('targets the sepolia chain and explorer for sepolia suggestions', () => {
    const url = getAttributionSuggestionUrl(
      '0x000000633b68f5d8d3a86593ebb815b4663bcbe0',
      'sepolia'
    );
    const template = new URL(url ?? '').searchParams.get('value') ?? '';
    expect(template).toContain('submission_chain: eip155-11155111');
    expect(template).toContain('url: https://sepolia.etherscan.io/address/');
  });

  it('returns null for unparseable addresses instead of templating them', () => {
    expect(getAttributionSuggestionUrl('not-an-address')).toBeNull();
    expect(getAttributionSuggestionUrl('0x1234')).toBeNull();
    expect(
      getAttributionSuggestionUrl('0x1234\n  evil: yaml\n#', 'mainnet')
    ).toBeNull();
  });

  it('defaults to mainnet when no network is given', () => {
    const url = getAttributionSuggestionUrl('0x000000633b68f5d8d3a86593ebb815b4663bcbe0');
    const template = new URL(url ?? '').searchParams.get('value') ?? '';
    expect(template).toContain('submission_chain: eip155-1');
  });

  it('formats blob gas fees in gwei', () => {
    expect(formatWeiToGwei('9389122')).toBe('0.009389 Gwei');
    expect(formatWeiToGwei('1000000000')).toBe('1 Gwei');
    expect(formatWeiToGwei('123456789012345678901234567890')).toBe(
      '123,456,789,012,345,678,901.234568 Gwei'
    );
    expect(formatGwei('0.008487503')).toBe('0.008488 Gwei');
  });

  it('formats durations and percentages compactly', () => {
    expect(formatDuration(20.7)).toBe('21 sec');
    expect(formatDuration(314.03)).toBe('5 min');
    expect(formatDuration(5400)).toBe('1.5 hr');
    expect(formatPercent(35.7143)).toBe('35.7%');
  });

  it('formats blob sizes, counts, utilization, and fee headroom', () => {
    expect(formatBlobSize(131072)).toBe('128 KB');
    expect(getBlobCount(262144)).toBe(2);
    expect(getBlobCount(undefined, 262144)).toBe(2);
    expect(getBlobCount(131073)).toBe(2);
    expect(getBlobCount(undefined, 131073)).toBe(2);
    expect(formatBlobCount(2)).toBe('2 blobs');
    expect(formatUtilizationPercent(9.52)).toBe('9.52%');
    expect(formatFeeHeadroom('93.083922')).toBe('93.1%');
  });

  it('formats enriched blob fees and costs', () => {
    expect(formatBlobFee('0.008487503')).toBe('0.008488 Gwei');
    expect(formatBlobFee(undefined, '1000000000')).toBe('1 Gwei');
    expect(formatBlobWeiCost('9065041362944')).toBe('9,065.0414 Gwei');
    expect(formatBlobWeiCost('500')).toBe('500 Wei');
    // A decimal-shaped wei value stays interpreted as wei, not reinterpreted
    // as ETH (which would overstate it by 1e18).
    expect(formatBlobWeiCost('1000000000.000000000000000000')).toBe('1 Gwei');
    expect(formatBlobTotalCost('0.001')).toBe('0.001 ETH');
    expect(formatBlobTotalCost('9065041362944')).toBe('9,065.0414 Gwei');
  });
});

describe('parseSearchQuery', () => {
  const address = '0x1234567890abcdef1234567890abcdef12345678';
  const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  it('parses a bare block number', () => {
    expect(parseSearchQuery('25467750')).toEqual({ kind: 'block', blockNumber: '25467750' });
  });

  it('parses block numbers with prefix, commas, and whitespace', () => {
    expect(parseSearchQuery('block:25467750')).toEqual({ kind: 'block', blockNumber: '25467750' });
    expect(parseSearchQuery('BLOCK: 25,467,750')).toEqual({ kind: 'block', blockNumber: '25467750' });
    expect(parseSearchQuery('  25467750  ')).toEqual({ kind: 'block', blockNumber: '25467750' });
  });

  it('parses addresses bare and with the rollup prefix', () => {
    expect(parseSearchQuery(address)).toEqual({ kind: 'address', address });
    expect(parseSearchQuery(`rollup:${address.toUpperCase().replace('0X', '0x')}`)).toEqual({
      kind: 'address',
      address,
    });
  });

  it('parses transaction hashes bare and with the tx prefix', () => {
    expect(parseSearchQuery(txHash)).toEqual({ kind: 'transaction', txHash });
    expect(parseSearchQuery(`tx:${txHash}`)).toEqual({ kind: 'transaction', txHash });
  });

  it('parses 0x01-prefixed hashes as blob versioned hashes', () => {
    const blobHash = `0x01${'ab'.repeat(31)}`;
    expect(parseSearchQuery(blobHash)).toEqual({ kind: 'blob', versionedHash: blobHash });
    expect(parseSearchQuery(`blob:${blobHash}`)).toEqual({ kind: 'blob', versionedHash: blobHash });
    // An explicit tx: prefix overrides the version-byte heuristic.
    expect(parseSearchQuery(`tx:${blobHash}`)).toEqual({ kind: 'transaction', txHash: blobHash });
    // blob: requires a plausible versioned hash.
    expect(parseSearchQuery(`blob:${txHash}`)).toBeNull();
  });

  it('rejects values that do not match their prefix', () => {
    expect(parseSearchQuery(`block:${txHash}`)).toBeNull();
    expect(parseSearchQuery('tx:25467750')).toBeNull();
    expect(parseSearchQuery(`rollup:${txHash}`)).toBeNull();
  });

  it('rejects unknown prefixes, empty values, and free text', () => {
    expect(parseSearchQuery('http://example.com')).toBeNull();
    expect(parseSearchQuery('block:')).toBeNull();
    expect(parseSearchQuery('')).toBeNull();
    expect(parseSearchQuery('recent rollup blob activity')).toBeNull();
    expect(parseSearchQuery('0')).toBeNull();
    expect(parseSearchQuery('0x1234')).toBeNull();
  });
});

describe('assignSeriesColors', () => {
  // The live mainnet attribution series as of 2026-07.
  const mainnetSeries = [
    { key: 'arbitrum_one', category: 'rollup' },
    { key: 'op_mainnet', category: 'rollup' },
    { key: 'base', category: 'rollup' },
    { key: 'robinhood_chain', category: 'rollup' },
    { key: 'world_chain', category: 'rollup' },
    { key: 'other', category: 'other' },
    { key: 'unknown', category: 'unknown' },
  ];

  it('gives every series a color and all colors are distinct when they fit the palette', () => {
    const colors = assignSeriesColors(mainnetSeries);
    const values = mainnetSeries.map((s) => colors[s.key]);
    expect(values.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
    expect(new Set(values).size).toBe(mainnetSeries.length);
  });

  it('assigns the fixed neutrals to the other and unknown categories', () => {
    const colors = assignSeriesColors(mainnetSeries);
    expect(colors.other).toBe('#c2c8d0');
    expect(colors.unknown).toBe('#747781');
    expect(colors.other).not.toBe(colors.unknown);
  });

  it('is independent of input order', () => {
    const shuffled = [...mainnetSeries].reverse();
    expect(assignSeriesColors(shuffled)).toEqual(assignSeriesColors(mainnetSeries));
  });

  it('handles arbitrary new keys without configuration', () => {
    const colors = assignSeriesColors([
      { key: 'some_future_rollup', category: 'rollup' },
      { key: 'another_l2' },
    ]);
    expect(colors.some_future_rollup).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.another_l2).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.some_future_rollup).not.toBe(colors.another_l2);
  });

  it('still returns a color for every key when there are more series than palette slots', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ key: `rollup_${i}` }));
    const colors = assignSeriesColors(many);
    for (const { key } of many) {
      expect(colors[key]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('attributionColorKey', () => {
  it('normalizes display names to backend series key format', () => {
    expect(attributionColorKey('Arbitrum One')).toBe('arbitrum_one');
    expect(attributionColorKey('OP Mainnet')).toBe('op_mainnet');
    expect(attributionColorKey('Base')).toBe('base');
    expect(attributionColorKey('Robinhood Chain')).toBe('robinhood_chain');
    expect(attributionColorKey('  X Layer  ')).toBe('x_layer');
  });
});
