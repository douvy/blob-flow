/**
 * Utility functions for the application
 */
import { formatUnits } from 'viem';

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
 * @param weiValue - The value in wei as a string or number
 * @returns Formatted string with appropriate unit
 */
export function formatWeiToReadable(weiValue: string | number): string {
  // Convert string to bigint if needed
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : BigInt(weiValue.toString());

  // Define thresholds for different units
  const GWEI_THRESHOLD = BigInt(1_000_000_000); // 10^9
  const ETHER_THRESHOLD = BigInt(1_000_000_000_000_000_000); // 10^18

  // Choose the appropriate unit based on the value's size
  if (wei >= ETHER_THRESHOLD) {
    // Format as ETH (10^18)
    return `${formatUnits(wei, 18)} ETH`;
  } else if (wei >= GWEI_THRESHOLD) {
    // Format as Gwei (10^9)
    return `${formatUnits(wei, 9)} Gwei`;
  } else {
    // Format as Wei
    return `${wei.toString()} Wei`;
  }
}

export function formatWeiToGwei(weiValue: string | number, maximumFractionDigits = 6): string {
  const numericWei = Number(weiValue);
  if (!Number.isFinite(numericWei)) {
    return `${weiValue} Wei`;
  }

  const gwei = numericWei / 1_000_000_000;
  return `${formatCompactDecimal(gwei, maximumFractionDigits)} Gwei`;
}

export function formatGwei(gweiValue: string | number, maximumFractionDigits = 6): string {
  const numericGwei = Number(gweiValue);
  if (!Number.isFinite(numericGwei)) {
    return `${gweiValue} Gwei`;
  }

  return `${formatCompactDecimal(numericGwei, maximumFractionDigits)} Gwei`;
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

function formatCompactDecimal(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value);
}
