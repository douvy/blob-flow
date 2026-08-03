/**
 * Shared logic for the rollup head-to-head comparison pages (/vs/[a]/[b]).
 *
 * Kept free of client-only imports so both the client battle card and the
 * server-rendered Open Graph image can derive identical numbers from the
 * attribution-usage summary shares.
 */
import type {
  BackendAttributionUsageShare,
  BackendChartRange,
  VsComparison,
  VsComparisonRow,
  VsWinner,
} from '@/types';

export const VS_RANGES: readonly BackendChartRange[] = ['1h', '24h', '7d', '30d', 'all'] as const;

export const DEFAULT_VS_RANGE: BackendChartRange = '24h';

/** Human captions for the range switcher and OG image. */
export const VS_RANGE_LABELS: Record<BackendChartRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

/** Coerce an arbitrary ?range= value to a supported range, defaulting to 24h. */
export function parseVsRange(value: string | null | undefined): BackendChartRange {
  return (VS_RANGES as readonly string[]).includes(value ?? '')
    ? (value as BackendChartRange)
    : DEFAULT_VS_RANGE;
}

// Short URL forms people will naturally type, mapped to the blob-list entity
// slugs the backend share keys translate to. Mirrors ATTRIBUTION_NAME_ALIASES
// in src/utils for icon lookups.
const ENTITY_SLUG_ALIASES: Record<string, string> = {
  arbitrum: 'arbitrum-one',
  optimism: 'op-mainnet',
  zksync: 'zksync-era',
};

/** Canonical URL slug for a route param: lowercased, decoded, alias-resolved. */
export function normalizeEntitySlug(raw: string | undefined): string {
  let decoded = raw ?? '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Malformed escapes fall through as-is; they simply will not match a share.
  }
  const slug = decoded.trim().toLowerCase().replace(/[\s_]+/g, '-');
  return ENTITY_SLUG_ALIASES[slug] ?? slug;
}

/** Backend share key (snake_case) for a URL slug (kebab-case). */
export function entityKeyForSlug(raw: string | undefined): string {
  return normalizeEntitySlug(raw).replace(/-/g, '_');
}

/** URL slug (kebab-case) for a backend share key (snake_case). */
export function slugForEntityKey(key: string): string {
  return key.trim().toLowerCase().replace(/_/g, '-');
}

/** The share matching a URL slug, or undefined when absent from this range. */
export function findShareBySlug(
  shares: readonly BackendAttributionUsageShare[],
  raw: string | undefined,
): BackendAttributionUsageShare | undefined {
  const key = entityKeyForSlug(raw);
  return shares.find((share) => share.key === key);
}

// Words whose brand casing title-casing would get wrong.
const SLUG_WORD_CASING: Record<string, string> = {
  op: 'OP',
  zksync: 'zkSync',
  x: 'X',
  l2: 'L2',
};

/**
 * Display name guessed from a slug alone, for metadata rendered before (or
 * without) share data. Prefer the share's `name` whenever one is available.
 */
export function humanizeEntitySlug(raw: string | undefined): string {
  const slug = normalizeEntitySlug(raw);
  if (!slug) return 'Unknown';
  return slug
    .split('-')
    .map((word) => SLUG_WORD_CASING[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Path (plus range query) for a matchup, always linkable and shareable. */
export function buildVsHref(aSlug: string, bSlug: string, range: BackendChartRange): string {
  const base = `/vs/${encodeURIComponent(aSlug)}/${encodeURIComponent(bSlug)}`;
  return range === DEFAULT_VS_RANGE ? base : `${base}?range=${range}`;
}

/** Whole-wei bigint from a backend cost string, tolerating fractional tails. */
function weiToBigInt(value: string | undefined): bigint {
  const whole = (value ?? '0').trim().split('.')[0];
  if (!/^\d+$/.test(whole)) return BigInt(0);
  return BigInt(whole);
}

// A blob carries 131072 bytes (128 KiB), exactly 1/8 MiB, so
// cost-per-MB = total_cost / (blob_count / 8) = total_cost * 8 / blob_count.
const BLOBS_PER_MB = BigInt(8);

/** Average wei paid per blob, floored; '0' when no blobs were posted. */
export function averageCostPerBlobWei(share: BackendAttributionUsageShare): string {
  if (share.blob_count <= 0) return '0';
  return (weiToBigInt(share.total_cost_wei) / BigInt(share.blob_count)).toString();
}

/** Wei paid per MB of blobspace, floored; '0' when no blobs were posted. */
export function costPerMbWei(share: BackendAttributionUsageShare): string {
  if (share.blob_count <= 0) return '0';
  return ((weiToBigInt(share.total_cost_wei) * BLOBS_PER_MB) / BigInt(share.blob_count)).toString();
}

function decideWinner(
  a: string,
  b: string,
  betterDirection: 'higher' | 'lower',
  numeric: 'bigint' | 'number',
): VsWinner {
  let diff: number;
  if (numeric === 'bigint') {
    const aValue = weiToBigInt(a);
    const bValue = weiToBigInt(b);
    diff = aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
  } else {
    const aValue = Number(a);
    const bValue = Number(b);
    diff = aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
  }
  if (diff === 0) return 'tie';
  if (betterDirection === 'higher') return diff > 0 ? 'a' : 'b';
  return diff > 0 ? 'b' : 'a';
}

interface VsRowSpec {
  key: string;
  label: string;
  format: VsComparisonRow['format'];
  betterDirection: VsComparisonRow['betterDirection'];
  numeric: 'bigint' | 'number';
  value: (share: BackendAttributionUsageShare) => string;
}

// Volume and share rows reward dominance (higher wins); the per-unit cost
// rows reward efficiency (lower wins).
const VS_ROW_SPECS: readonly VsRowSpec[] = [
  {
    key: 'blobs',
    label: 'Blobs posted',
    format: 'count',
    betterDirection: 'higher',
    numeric: 'number',
    value: (share) => String(share.blob_count),
  },
  {
    key: 'blob-share',
    label: 'Blob share',
    format: 'percent',
    betterDirection: 'higher',
    numeric: 'number',
    value: (share) => String(share.blob_share_percent),
  },
  {
    key: 'eth-spent',
    label: 'ETH spent',
    format: 'eth',
    betterDirection: 'higher',
    numeric: 'bigint',
    value: (share) => share.total_cost_wei || '0',
  },
  {
    key: 'spend-share',
    label: 'Spend share',
    format: 'percent',
    betterDirection: 'higher',
    numeric: 'number',
    value: (share) => String(share.spend_share_percent),
  },
  {
    key: 'avg-cost-per-blob',
    label: 'Avg cost per blob',
    format: 'cost',
    betterDirection: 'lower',
    numeric: 'bigint',
    value: averageCostPerBlobWei,
  },
  {
    key: 'cost-per-mb',
    label: 'Cost per MB',
    format: 'cost',
    betterDirection: 'lower',
    numeric: 'bigint',
    value: costPerMbWei,
  },
];

/** Build the full matchup: every metric row plus the overall verdict. */
export function buildVsComparison(
  a: BackendAttributionUsageShare,
  b: BackendAttributionUsageShare,
): VsComparison {
  const rows: VsComparisonRow[] = VS_ROW_SPECS.map((spec) => {
    const aValue = spec.value(a);
    const bValue = spec.value(b);
    return {
      key: spec.key,
      label: spec.label,
      format: spec.format,
      betterDirection: spec.betterDirection,
      a: aValue,
      b: bValue,
      winner: decideWinner(aValue, bValue, spec.betterDirection, spec.numeric),
    };
  });

  const rowWins = {
    a: rows.filter((row) => row.winner === 'a').length,
    b: rows.filter((row) => row.winner === 'b').length,
  };

  // Most rows taken wins the matchup; a dead heat falls back to raw blob
  // volume before conceding a draw.
  let overall: VsWinner;
  if (rowWins.a !== rowWins.b) {
    overall = rowWins.a > rowWins.b ? 'a' : 'b';
  } else if (a.blob_count !== b.blob_count) {
    overall = a.blob_count > b.blob_count ? 'a' : 'b';
  } else {
    overall = 'tie';
  }

  return { rows, rowWins, overall };
}
