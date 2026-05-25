import {
  formatDate,
  formatDuration,
  formatGwei,
  formatNumber,
  formatPercent,
  formatWeiToGwei,
  formatWeiToReadable,
  truncateAddress
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
    expect(formatWeiToReadable('1000000000')).toContain('Gwei');
    expect(formatWeiToReadable('1000000000000000000')).toContain('ETH');
  });

  it('formats blob gas fees in gwei', () => {
    expect(formatWeiToGwei('9389122')).toBe('0.009389 Gwei');
    expect(formatWeiToGwei('1000000000')).toBe('1 Gwei');
    expect(formatGwei('0.008487503')).toBe('0.008488 Gwei');
  });

  it('formats durations and percentages compactly', () => {
    expect(formatDuration(20.7)).toBe('21 sec');
    expect(formatDuration(314.03)).toBe('5 min');
    expect(formatDuration(5400)).toBe('1.5 hr');
    expect(formatPercent(35.7143)).toBe('35.7%');
  });
});
