/**
 * Utility functions for the application
 */
import { getAddress } from 'viem';
import { SearchTarget } from '@/types';
import { ATTRIBUTION_CONTRIBUTING_URL, ATTRIBUTION_REPO_URL } from '@/constants';
import { SERIES_COLOR_PALETTE, SERIES_CATEGORY_NEUTRALS } from '@/constants/chartTheme';

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
const BYTES_PER_BLOB = 131072;

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function truncateAddress(address: string, length: number = 6): string {
  if (!address) return '';
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

/**
 * Explorer URLs come from the backend; only pass through http(s) links so a
 * malformed payload cannot inject javascript: or data: hrefs into anchors.
 */
export function safeExplorerUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
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

/**
 * FNV-1a 32-bit. Stable across sessions and page loads so a series keeps its
 * color no matter when or where it renders.
 */
function fnv1aHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface SeriesColorInput {
  key: string;
  category?: string;
}

/**
 * Assign a color to every series without any per-network configuration.
 *
 * Categories listed in SERIES_CATEGORY_NEUTRALS (other, unknown) get their
 * fixed neutral. Every remaining key is hashed to a preferred palette slot
 * and probes forward to a free one, so colors are distinct whenever the
 * series count fits the palette and each key prefers the same slot
 * regardless of which chart or table renders it. Keys are processed in
 * sorted order so the result does not depend on backend response ordering.
 * If there are more series than palette slots, later keys fall back to
 * their hashed slot and reuse a color; identity then rests on the label
 * next to the mark.
 */
export function assignSeriesColors(
  series: ReadonlyArray<SeriesColorInput>
): Record<string, string> {
  const colors: Record<string, string> = {};
  const paletteKeys = new Set<string>();

  for (const { key, category } of series) {
    const neutral = category ? SERIES_CATEGORY_NEUTRALS[category] : undefined;
    if (neutral) {
      colors[key] = neutral;
    } else {
      paletteKeys.add(key);
    }
  }

  const slots = SERIES_COLOR_PALETTE.length;
  const taken = new Set<number>();
  for (const key of [...paletteKeys].sort()) {
    const preferred = fnv1aHash(key) % slots;
    let slot = preferred;
    let probes = 0;
    while (taken.has(slot) && probes < slots) {
      slot = (slot + 1) % slots;
      probes++;
    }
    if (probes === slots) slot = preferred;
    taken.add(slot);
    colors[key] = SERIES_COLOR_PALETTE[slot];
  }

  return colors;
}

/**
 * Normalize an attribution display name to the backend's series key format
 * ("OP Mainnet" to "op_mainnet"), so surfaces that only have names (like the
 * top users table) hash to the same preferred color as the chart series.
 */
export function attributionColorKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ATTRIBUTION_CHAINS: Record<string, { caip2: string; explorerUrl: string }> = {
  mainnet: { caip2: 'eip155-1', explorerUrl: 'https://etherscan.io' },
  sepolia: { caip2: 'eip155-11155111', explorerUrl: 'https://sepolia.etherscan.io' },
};

/**
 * Prefilled GitHub "new file" URL for suggesting an attribution in the
 * blob-list registry. When a contributor without write access commits the
 * prefilled file, GitHub forks the repo and opens a pull request, so the
 * link doubles as a lightweight PR form.
 *
 * Returns null when the address does not parse: route params are user input,
 * and anything that is not a real address has no place in the template.
 */
export function getAttributionSuggestionUrl(
  address: string,
  networkApiParam?: string
): string | null {
  const chain =
    ATTRIBUTION_CHAINS[networkApiParam ?? 'mainnet'] ?? ATTRIBUTION_CHAINS.mainnet;

  // The registry schema requires checksummed addresses; route params can
  // arrive lowercased, so normalize.
  let checksummedAddress: string;
  try {
    checksummedAddress = getAddress(address);
  } catch {
    return null;
  }

  const template = `# Attribution suggestion for ${checksummedAddress}
# Full schema and evidence rules: ${ATTRIBUTION_CONTRIBUTING_URL}
# 1. Rename this file to match the id field below (entities/<id>.yaml).
# 2. Replace the placeholder entity fields.
# 3. Keep at least one piece of public, durable evidence per address.
schema_version: 1
id: your-entity-id
name: Your Entity Name
category: rollup
status: active
description: One-line description of the entity.
website: https://example.com
chain_refs:
  - caip2: ${chain.caip2}
    relationship: settlement_chain
addresses:
  - submission_chain: ${chain.caip2}
    address: "${checksummedAddress}"
    role: batcher # pick one: batcher, sequencer, proposer, operator, unknown, ...
    label: Your Entity blob submitter
    status: active
    confidence: probable
    valid_from:
      block: 0 # replace with the first block this address submitted blobs in
    valid_to: null
    evidence:
      # Prefer strong public sources: official docs, verified contracts,
      # official repos. An explorer link alone usually only supports
      # probable/inferred confidence.
      - type: analysis
        url: ${chain.explorerUrl}/address/${checksummedAddress}
`;

  const params = new URLSearchParams({
    filename: 'entities/your-entity-id.yaml',
    value: template,
  });
  return `${ATTRIBUTION_REPO_URL}/new/main?${params.toString()}`;
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

  // Decimal inputs are already denominated in ETH; integer inputs are wei.
  // Normalize both to a wei amount so the unit thresholds below apply
  // consistently and equal costs render identically regardless of shape.
  const weiValue = rawCost.includes('.') ? ethStringToWei(rawCost) : BigInt(rawCost);
  const weiString = weiValue.toString();

  const gweiThreshold = BigInt(1_000_000_000);
  // Prefer ETH once the cost reaches a meaningful fraction of an ether
  // (1e14 wei = 0.0001 ETH). Below that, tens of millions of Gwei read poorly.
  const ethDisplayThreshold = BigInt(100_000_000_000_000);

  if (weiValue >= ethDisplayThreshold) {
    return `${formatDecimalString(formatDecimalUnits(weiString, 18), 6)} ETH`;
  }

  if (weiValue >= gweiThreshold) {
    return `${formatDecimalString(formatDecimalUnits(weiString, 9), 4)} Gwei`;
  }

  return `${weiString} Wei`;
}

function ethStringToWei(rawEth: string): bigint {
  const [wholePart, fractionalPart = ''] = rawEth.split('.');
  // Sub-wei precision is not representable, so truncate beyond 18 decimals.
  const paddedFractional = fractionalPart.slice(0, 18).padEnd(18, '0');
  return BigInt(wholePart) * BigInt('1000000000000000000') + BigInt(paddedFractional);
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
    return Math.max(1, Math.ceil(blobGasUsed / BLOB_GAS_PER_BLOB));
  }

  if (blobSizeBytes && blobSizeBytes > 0) {
    return Math.max(1, Math.ceil(blobSizeBytes / BYTES_PER_BLOB));
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

export function formatBlobFee(gweiValue?: string, weiValue?: string): string {
  if (gweiValue) return safeFormat(() => formatGwei(gweiValue));
  if (weiValue) return safeFormat(() => formatWeiToGwei(weiValue));
  return '-';
}

export function formatBlobWeiCost(weiValue?: string): string {
  if (!weiValue) return '-';
  // Per-blob costs are often a tiny fraction of an ether. Denominate in
  // Gwei/Wei so small values stay precise instead of collapsing to a
  // "<0.000001 ETH" placeholder. These fields are integer wei, so drop any
  // fractional part (wei is indivisible): that keeps the value interpreted
  // as wei rather than being misread as ETH by formatCostEthOrWei's decimal
  // branch, which would overstate the cost by 1e18.
  const integerWei = weiValue.split('.')[0];
  return safeFormat(() => formatCostEthOrWei(integerWei));
}

export function formatBlobTotalCost(totalCost?: string): string {
  if (!totalCost) return '-';
  if (totalCost.includes('.')) return safeFormat(() => formatCostEthOrWei(totalCost));
  return formatBlobWeiCost(totalCost);
}

function safeFormat(formatter: () => string): string {
  try {
    return formatter();
  } catch {
    return '-';
  }
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

const SEARCH_PREFIXES = ['block', 'tx', 'blob', 'rollup'] as const;
type SearchPrefix = (typeof SEARCH_PREFIXES)[number];

const BLOCK_NUMBER_PATTERN = /^\d+$/;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/i;
const HASH_64_PATTERN = /^0x[0-9a-f]{64}$/i;

/**
 * Parse a search query into a navigable target. Accepts a bare block number,
 * address, transaction hash, or blob versioned hash, optionally qualified
 * with one of the `block:` / `tx:` / `blob:` / `rollup:` prefixes offered in
 * the search modal. A bare 64-hex hash starting `0x01` is treated as a blob
 * versioned hash (their version byte is always 0x01), any other as a
 * transaction hash. Returns null when the query doesn't resolve to a
 * destination.
 */
export function parseSearchQuery(query: string): SearchTarget | null {
  let value = query.trim();
  let prefix: SearchPrefix | null = null;

  const prefixMatch = value.match(/^([a-z]+):\s*(.*)$/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].toLowerCase();
    if (!(SEARCH_PREFIXES as readonly string[]).includes(candidate)) return null;
    prefix = candidate as SearchPrefix;
    value = prefixMatch[2].trim();
  }
  if (!value) return null;

  const blockNumber = value.replace(/,/g, '');
  if ((prefix === null || prefix === 'block') && BLOCK_NUMBER_PATTERN.test(blockNumber)) {
    return Number(blockNumber) > 0 ? { kind: 'block', blockNumber } : null;
  }
  if ((prefix === null || prefix === 'rollup') && ADDRESS_PATTERN.test(value)) {
    return { kind: 'address', address: value.toLowerCase() };
  }
  if (HASH_64_PATTERN.test(value)) {
    const hash = value.toLowerCase();
    const isVersionedBlobHash = hash.startsWith('0x01');
    if (prefix === 'blob') {
      return isVersionedBlobHash ? { kind: 'blob', versionedHash: hash } : null;
    }
    if (prefix === 'tx') {
      return { kind: 'transaction', txHash: hash };
    }
    if (prefix === null) {
      return isVersionedBlobHash
        ? { kind: 'blob', versionedHash: hash }
        : { kind: 'transaction', txHash: hash };
    }
  }
  return null;
}
