import {
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
  getBlobCount,
  getNetworkIconSrc,
  parseSearchQuery,
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
    expect(formatBlobWeiCost('9065041362944')).toBe('0.000009 ETH');
    expect(formatBlobTotalCost('0.001')).toBe('0.001 ETH');
    expect(formatBlobTotalCost('9065041362944')).toBe('0.000009 ETH');
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
    expect(parseSearchQuery('12 pending blobs from Optimism')).toBeNull();
    expect(parseSearchQuery('0')).toBeNull();
    expect(parseSearchQuery('0x1234')).toBeNull();
  });
});
