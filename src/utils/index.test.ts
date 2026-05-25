import {
  formatBlobCount,
  formatBlobSize,
  formatDate,
  formatFeeHeadroom,
  formatGwei,
  getNetworkIconSrc,
  formatNumber,
  formatUtilizationPercent,
  formatWeiToEth,
  formatWeiToReadable,
  getBlobCount,
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
    expect(formatWeiToReadable('1000000000')).toContain('Gwei');
    expect(formatWeiToReadable('1000000000000000000')).toContain('ETH');
    expect(formatWeiToReadable('4858655014.05815109')).toContain('Gwei');
  });

  it('formats gwei, eth, sizes, blob counts, utilization, and headroom', () => {
    expect(formatGwei('0.008583245')).toBe('0.008583 Gwei');
    expect(formatGwei('1000000000', { fromWei: true })).toBe('1 Gwei');
    expect(formatWeiToEth('9065041362944')).toBe('0.000009 ETH');
    expect(formatBlobSize(16777216)).toBe('16 MB');
    expect(getBlobCount(262144, 16777216)).toBe(2);
    expect(formatBlobCount(2)).toBe('2 blobs');
    expect(formatUtilizationPercent(9.52)).toBe('9.52%');
    expect(formatFeeHeadroom('93.083922')).toBe('93.1%');
  });
});
