/**
 * Utility functions for the application
 */
import { formatUnits } from 'viem';

const WEI_PER_GWEI = BigInt(1_000_000_000);
const WEI_PER_ETHER = BigInt(1_000_000_000_000_000_000);
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

export function getNetworkIconSrc(name?: string | null): string | null {
  if (!name) return null;

  const normalized = name.toLowerCase();

  if (normalized.includes('arbitrum')) return '/images/arbitrum.png';
  if (normalized.includes('optimism') || normalized.includes('op mainnet')) return '/images/optimism.png';
  if (normalized.includes('base')) return '/images/base.png';
  if (normalized.includes('zksync') || normalized.includes('zk sync')) return '/images/zksync.png';

  return null;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toWholeWei(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  const normalized = value.toString().split('.')[0] || '0';
  return BigInt(normalized);
}

function formatDecimal(value: number, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value);
}

/**
 * Formats a wei value to a human-readable string with appropriate units
 * Automatically selects the best unit based on the value's size
 * @param weiValue - The value in wei as a string or number
 * @returns Formatted string with appropriate unit
 */
export function formatWeiToReadable(weiValue: string | number | bigint): string {
  const wei = toWholeWei(weiValue);

  // Choose the appropriate unit based on the value's size
  if (wei >= WEI_PER_ETHER) {
    // Format as ETH (10^18)
    return `${formatUnits(wei, 18)} ETH`;
  } else if (wei >= WEI_PER_GWEI) {
    // Format as Gwei (10^9)
    return `${formatUnits(wei, 9)} Gwei`;
  } else {
    // Format as Wei
    return `${wei.toString()} Wei`;
  }
}

export function formatWeiToEth(weiValue?: string | number | bigint): string {
  if (weiValue === undefined || weiValue === null || weiValue === '') return '-';

  const wei = toWholeWei(weiValue);
  if (wei === BigInt(0)) return '0 ETH';

  const eth = Number(formatUnits(wei, 18));
  if (eth > 0 && eth < 0.000001) return '<0.000001 ETH';

  return `${formatDecimal(eth, eth < 0.001 ? 6 : 4)} ETH`;
}

export function formatGwei(
  value?: string | number | bigint,
  options: { fromWei?: boolean } = {}
): string {
  if (value === undefined || value === null || value === '') return '-';

  const gwei = options.fromWei
    ? Number(formatUnits(toWholeWei(value), 9))
    : Number(value);

  if (!Number.isFinite(gwei)) return '-';

  return `${formatDecimal(gwei, gwei < 1 ? 6 : 3)} Gwei`;
}

export function formatBlobSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return '-';

  if (bytes >= BYTES_PER_MIB) {
    return `${formatDecimal(bytes / BYTES_PER_MIB, 1)} MB`;
  }

  if (bytes >= BYTES_PER_KIB) {
    return `${formatDecimal(bytes / BYTES_PER_KIB, 1)} KB`;
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

  return `${formatDecimal(percent, percent < 10 ? 2 : 1)}%`;
}

export function formatFeeHeadroom(value?: string | number): string {
  if (value === undefined || value === null || value === '') return '-';

  return formatUtilizationPercent(value);
}
