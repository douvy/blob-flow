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

const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * 1024;
const BLOB_GAS_PER_BLOB = 131072;
const BYTES_PER_BLOB = 16777216;

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

export function getNetworkIconSrc(name?: string | null): string | null {
  return name ? getAttributionImageSrc(name) : null;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a wei value to a human-readable string with appropriate units.
 * Fractional wei strings are preserved for aggregate values such as averages.
 */
export function formatWeiToReadable(weiValue: string | number): string {
  const rawWeiValue = normalizeDecimalString(weiValue);
  const wholeWeiValue = rawWeiValue.split('.')[0];
  const wholeWei = BigInt(wholeWeiValue);

  const gweiThreshold = BigInt(1_000_000_000);
  const etherThreshold = BigInt(1_000_000_000_000_000_000);

  if (wholeWei >= etherThreshold) {
    return `${formatDecimalUnits(rawWeiValue, 18)} ETH`;
  }

  if (wholeWei >= gweiThreshold) {
    return `${formatDecimalUnits(rawWeiValue, 9)} Gwei`;
  }

  return `${rawWeiValue} Wei`;
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

export function formatWeiToEth(
  weiValue: string | number,
  compact = false
): string {
  const rawWeiValue = normalizeDecimalString(weiValue);
  const ethValue = formatDecimalUnits(rawWeiValue, 18);

  if (!compact) {
    return `${ethValue} ETH`;
  }

  const ethNumber = Number(ethValue);
  if (ethNumber > 0 && ethNumber < 0.000001) {
    return '<0.000001 ETH';
  }

  const maxDigits = ethNumber < 0.001 ? 6 : 4;
  return `${formatDecimalString(ethValue, maxDigits)} ETH`;
}

export function formatCostEthOrWei(costEthOrWei: string | number): string {
  const rawCost = normalizeDecimalString(costEthOrWei);

  if (rawCost.includes('.')) {
    return `${rawCost} ETH`;
  }

  return formatWeiToReadable(rawCost);
}

export function formatBlobSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return '-';

  if (bytes >= BYTES_PER_MIB) {
    return `${formatCompactDecimal(bytes / BYTES_PER_MIB, 1)} MB`;
  }

  if (bytes >= BYTES_PER_KIB) {
    return `${formatCompactDecimal(bytes / BYTES_PER_KIB, 1)} KB`;
  }

  return `${formatNumber(bytes)} B`;
}

export function getBlobCount(blobGasUsed?: number, blobSizeBytes?: number): number {
  if (blobGasUsed && blobGasUsed > 0) {
    return Math.max(1, Math.round(blobGasUsed / BLOB_GAS_PER_BLOB));
  }

  if (blobSizeBytes && blobSizeBytes > 0) {
    return Math.max(1, Math.round(blobSizeBytes / BYTES_PER_BLOB));
  }

  return 1;
}

export function formatBlobCount(count: number): string {
  return `${formatNumber(count)} blob${count === 1 ? '' : 's'}`;
}

export function formatUtilizationPercent(value?: string | number): string {
  if (value === undefined || value === null || value === '') return '-';

  const percent = Number(value);
  if (!Number.isFinite(percent)) return '-';

  return `${formatCompactDecimal(percent, percent < 10 ? 2 : 1)}%`;
}

export function formatFeeHeadroom(value?: string | number): string {
  if (value === undefined || value === null || value === '') return '-';

  return formatUtilizationPercent(value);
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
