/**
 * Utility functions for the application
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function truncateAddress(address: string, length: number = 6): string {
  if (!address) return '';
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a wei value to a human-readable string with appropriate units
 * Automatically selects the best unit based on the value's size
 * Fractional wei strings are preserved for aggregate values such as averages.
 * @param weiValue - The value in wei as a decimal string or number
 * @returns Formatted string with appropriate unit
 */
export function formatWeiToReadable(weiValue: string | number): string {
  const rawWeiValue = normalizeDecimalString(weiValue);
  const wholeWeiValue = rawWeiValue.split('.')[0];
  const wholeWei = BigInt(wholeWeiValue);

  // Define thresholds for different units
  const GWEI_THRESHOLD = BigInt(1_000_000_000); // 10^9
  const ETHER_THRESHOLD = BigInt(1_000_000_000_000_000_000); // 10^18

  // Choose the appropriate unit based on the value's size
  if (wholeWei >= ETHER_THRESHOLD) {
    // Format as ETH (10^18)
    return `${formatDecimalUnits(rawWeiValue, 18)} ETH`;
  } else if (wholeWei >= GWEI_THRESHOLD) {
    // Format as Gwei (10^9)
    return `${formatDecimalUnits(rawWeiValue, 9)} Gwei`;
  } else {
    // Format as Wei
    return `${rawWeiValue} Wei`;
  }
}

export function formatCostEthOrWei(costEthOrWei: string | number): string {
  const rawCost = normalizeDecimalString(costEthOrWei);

  if (rawCost.includes('.')) {
    return `${rawCost} ETH`;
  }

  return formatWeiToReadable(rawCost);
}

function normalizeDecimalString(value: string | number): string {
  const rawValue = typeof value === 'string' ? value.trim() : value.toString();

  if (!/^\d+(?:\.\d+)?$/.test(rawValue)) {
    throw new Error(`Invalid decimal value: ${rawValue}`);
  }

  const [wholePart, fractionalPart] = rawValue.split('.');
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '');
  const normalizedFractional = fractionalPart?.replace(/0+$/, '');

  if (!normalizedFractional) {
    return normalizedWhole;
  }

  return `${normalizedWhole}.${normalizedFractional}`;
}

function formatDecimalUnits(value: string, decimals: number): string {
  const [wholePart, fractionalPart = ''] = value.split('.');
  const digits = `${wholePart}${fractionalPart}`;
  const decimalIndex = wholePart.length - decimals;

  if (decimalIndex > 0) {
    return trimTrailingZeros(`${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`);
  }

  return trimTrailingZeros(`0.${'0'.repeat(Math.abs(decimalIndex))}${digits}`);
}

function trimTrailingZeros(value: string): string {
  const trimmedValue = value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return trimmedValue || '0';
}
