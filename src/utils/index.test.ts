import {
  formatCostEthOrWei,
  formatDate,
  formatNumber,
  formatWeiToEth,
  formatWeiToReadable,
  getAttributionImageSrc,
  getAttributionInitial,
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
});
