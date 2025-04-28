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