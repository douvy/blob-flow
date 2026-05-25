/**
 * Utility functions for the application
 */
const ATTRIBUTION_IMAGE_NAMES: Record<string, string> = {
  arbitrum: 'arbitrum',
  'arbitrum one': 'arbitrum',
  base: 'base',
  optimism: 'optimism',
  'op mainnet': 'optimism',
  zksync: 'zksync',
  'zksync era': 'zksync',
};

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function truncateAddress(address: string, length: number = 6): string {
  if (!address) return '';
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

export function getAttributionImageSrc(name: string): string | null {
  const imageName = ATTRIBUTION_IMAGE_NAMES[name.trim().toLowerCase()];
  return imageName ? `/images/${imageName}.png` : null;
}

export function getAttributionInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
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

export function formatWeiToGwei(weiValue: string | number, maximumFractionDigits = 6): string {
  const rawWeiValue = normalizeDecimalString(weiValue);
  const gweiValue = formatDecimalUnits(rawWeiValue, 9);
  return `${formatDecimalString(gweiValue, maximumFractionDigits)} Gwei`;
}

export function formatGwei(gweiValue: string | number, maximumFractionDigits = 6): string {
  const rawGweiValue = normalizeDecimalString(gweiValue);
  return `${formatDecimalString(rawGweiValue, maximumFractionDigits)} Gwei`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0 sec';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }

  const hours = seconds / 3600;
  return `${formatCompactDecimal(hours, 1)} hr`;
}

export function formatPercent(value: number, maximumFractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  return `${formatCompactDecimal(value, maximumFractionDigits)}%`;
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

function formatDecimalString(value: string, maximumFractionDigits: number): string {
  const normalizedValue = normalizeDecimalString(value);
  const [wholePart, fractionalPart = ''] = normalizedValue.split('.');
  const fractionDigits = Math.max(0, Math.floor(maximumFractionDigits));

  if (fractionDigits === 0) {
    return groupIntegerPart(
      shouldRoundUp(fractionalPart.charAt(0))
        ? incrementIntegerString(wholePart)
        : wholePart
    );
  }

  let roundedWholePart = wholePart;
  let roundedFractionalPart = fractionalPart.slice(0, fractionDigits);
  const nextDigit = fractionalPart.charAt(fractionDigits);

  if (shouldRoundUp(nextDigit)) {
    const rounded = incrementFractionString(
      roundedWholePart,
      roundedFractionalPart.padEnd(fractionDigits, '0')
    );
    roundedWholePart = rounded.wholePart;
    roundedFractionalPart = rounded.fractionalPart;
  }

  const trimmedFractionalPart = roundedFractionalPart.replace(/0+$/, '');
  const formattedWholePart = groupIntegerPart(roundedWholePart);

  if (!trimmedFractionalPart) {
    return formattedWholePart;
  }

  return `${formattedWholePart}.${trimmedFractionalPart}`;
}

function formatCompactDecimal(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value);
}

function incrementFractionString(wholePart: string, fractionalPart: string) {
  const digits = fractionalPart.split('');

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const nextDigit = Number(digits[index]) + 1;
    if (nextDigit < 10) {
      digits[index] = nextDigit.toString();
      return {
        wholePart,
        fractionalPart: digits.join(''),
      };
    }

    digits[index] = '0';
  }

  return {
    wholePart: incrementIntegerString(wholePart),
    fractionalPart: digits.join(''),
  };
}

function incrementIntegerString(value: string): string {
  return (BigInt(value) + BigInt(1)).toString();
}

function groupIntegerPart(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function shouldRoundUp(value: string): boolean {
  return value >= '5' && value <= '9';
}
