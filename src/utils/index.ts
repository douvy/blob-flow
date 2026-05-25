/**
 * Utility functions for the application
 */
import { formatUnits } from 'viem';

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
 * @param weiValue - The value in wei as a string or number
 * @returns Formatted string with appropriate unit
 */
export function formatWeiToReadable(weiValue: string | number): string {
  const integerWeiValue = weiValue.toString().split('.')[0] || '0';
  const wei = BigInt(integerWeiValue);

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
