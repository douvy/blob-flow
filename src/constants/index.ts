/**
 * Application constants
 */

import type { Network } from '../types';

export const APP_NAME = 'Blob Flow';
/** The brand as displayed: page titles, the header, and share imagery. */
export const SITE_NAME = 'BlobFlow';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.blobflow.com/api/v1';
// Canonical site origin for SEO metadata (Open Graph URLs, sitemap, robots).
// Set NEXT_PUBLIC_SITE_URL in production; falls back to Vercel's production
// domain, then the current deployment URL. Trailing slashes are stripped so
// path concatenation can't produce `//`.
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000';
export const SITE_URL = rawSiteUrl.replace(/\/+$/, '');

// Chart detail pages, used for SEO (sitemap entries, per-chart page titles,
// and social share cards). Keep the slugs and descriptions in sync with
// CHART_VIEWS in src/components/charts/chartViews.tsx (a "use client" module,
// so its exports can't be imported from server-only code).
export const CHART_PAGES = [
  {
    slug: 'base-fee',
    title: 'Blob Base Fee Chart',
    description: 'Blob base fee trend across the most recent indexed blocks.',
  },
  {
    slug: 'gas-utilization',
    title: 'Blob Gas Utilization Chart',
    description: 'Blob gas used per block against the current target.',
  },
  {
    slug: 'blob-usage',
    title: 'Blob Usage Chart',
    description: 'Bucketed blob usage grouped by known rollup or sender attribution.',
  },
  {
    slug: 'blob-share',
    title: 'Blob Share Chart',
    description: 'Each rollup or sender as a percentage of the blobs in every bucket.',
  },
  {
    slug: 'cost-comparison',
    title: 'Blob vs Calldata Cost Chart',
    description: 'Blob cost compared with calldata-equivalent cost approximation.',
  },
  {
    slug: 'rolling-market-stats',
    title: 'Rolling Market Stats',
    description: 'Windowed fee, utilization, cost, and sender totals.',
  },
] as const;
/**
 * Time ranges the header offers. Defined here rather than in
 * TimeRangeContext so server code (share card metadata and image rendering)
 * can read them: every export of a "use client" module reaches the server as
 * a client reference, not a callable value.
 */
export const TIME_RANGES = ['1h', '24h', '7d', '30d'] as const;

export type TimeRange = (typeof TIME_RANGES)[number];

export const DEFAULT_TIME_RANGE: TimeRange = '1h';

export function isTimeRange(value: unknown): value is TimeRange {
  return TIME_RANGES.some((range) => range === value);
}

/** Narrows an untrusted value (query param, storage) to a header range. */
export function parseTimeRange(
  value: string | undefined | null,
  fallback: TimeRange = DEFAULT_TIME_RANGE
): TimeRange {
  return isTimeRange(value) ? value : fallback;
}

export const HOMEPAGE_BLOCK_ROWS = 5;
export const BLOCKS_PAGE_LIMIT = 100;
export const BLOCKS_PAGE_SIZE = 20;

/**
 * Indexer health banner
 */
export const SECONDS_PER_BLOCK = 12;
export const INDEXER_STATUS_POLL_MS = 30_000;
/** Generous enough to absorb client clock skew and brief indexer hiccups. */
export const INDEXER_LAG_THRESHOLD_SECONDS = 120;
/**
 * The backend reports a backfill as active until it fully catches the chain
 * head, so the last handful of blocks is normal tip-chasing, not a state
 * worth a banner. Matches the lag threshold (120s / 12s per block).
 */
export const BACKFILL_MIN_REMAINING_BLOCKS =
  INDEXER_LAG_THRESHOLD_SECONDS / SECONDS_PER_BLOCK;

/**
 * Network configuration
 *
 * The live network list is fetched from GET /networks (see useNetwork). These
 * constants are the bootstrap fallback used before that request resolves and if
 * it fails, and DEFAULT_NETWORK seeds the initial selection.
 */
export const NETWORKS: Record<string, Network> = {
  MAINNET: {
    name: 'Mainnet',
    apiParam: 'mainnet',
  },
  SEPOLIA: {
    name: 'Sepolia',
    apiParam: 'sepolia',
  }
};

export const DEFAULT_NETWORK: Network = NETWORKS.MAINNET;

/**
 * Narrows an untrusted network value (a share link's query param) to one of
 * the known networks. The live list comes from GET /networks, but share
 * rendering happens without a session, so it stays on this finite bootstrap
 * set rather than forwarding an arbitrary string to the backend.
 */
export function parseNetwork(value: string | undefined | null): Network {
  return (
    Object.values(NETWORKS).find((network) => network.apiParam === value) ??
    DEFAULT_NETWORK
  );
}

export const ROUTES = {
  HOME: '/',
  BLOCKS: '/blocks',
  TRANSACTIONS: '/transactions',
  ADDRESSES: '/addresses',
  ABOUT: '/about',
};

export const THEME = {
  PRIMARY: '#3498db',
  SECONDARY: '#66CC99',
  BACKGROUND: '#f8f9fa',
  TEXT: '#333333',
  ERROR: '#FF6B6B',
};

/**
 * Attribution links for the raw blob viewer. Raw blob bytes are served by a
 * self-hosted BlobArchive (bloar) follower node.
 */
export const BLOB_ARCHIVE_SITE_URL = 'https://blobarchive.net';
export const BLOAR_REPO_URL = 'https://github.com/blobarchive/bloar';

/**
 * Public registry mapping blob-submitting addresses to entities. Unattributed
 * user pages link here so visitors can contribute an attribution.
 */
export const ATTRIBUTION_REPO_URL = 'https://github.com/tirante-dev/blob-list';
export const ATTRIBUTION_CONTRIBUTING_URL = `${ATTRIBUTION_REPO_URL}/blob/main/CONTRIBUTING.md`;

/**
 * How many pending transactions to sample for mempool views. Shared so the
 * homepage summary and the /mempool page hit the same React Query cache entry.
 */
export const MEMPOOL_SAMPLE_LIMIT = 50;

/**
 * Poll interval for the mempool transaction list. Shared so every mempool
 * consumer refreshes on the same cadence; between polls, WebSocket
 * mempool_update events keep the views current.
 */
export const MEMPOOL_REFRESH_MS = 30000;

/**
 * Tooltip explaining the fee cap headroom value shown as "room" in compact
 * views and "Headroom" in blob details. Shared so all views describe it the
 * same way.
 */
export const FEE_HEADROOM_TOOLTIP =
  'Fee cap headroom: how far this transaction\'s max fee sits above the current blob base fee. Higher means more buffer before it stops being includable.';
