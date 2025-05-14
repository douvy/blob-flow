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
