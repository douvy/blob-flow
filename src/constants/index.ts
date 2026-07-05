/**
 * Application constants
 */

export const APP_NAME = 'Blob Flow';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://blob-indexer.ahkc.win/api/v1';
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

// Chart detail pages, used for SEO (sitemap entries, per-chart page titles).
// Keep the slugs in sync with CHART_VIEWS in
// src/components/charts/chartViews.tsx (a "use client" module, so its
// exports can't be imported from server-only code).
export const CHART_PAGES = [
  { slug: 'base-fee', title: 'Blob Base Fee Chart' },
  { slug: 'gas-utilization', title: 'Blob Gas Utilization Chart' },
  { slug: 'l2-usage', title: 'L2 Blob Usage Chart' },
  { slug: 'cost-comparison', title: 'Blob vs Calldata Cost Chart' },
  { slug: 'rolling-market-stats', title: 'Rolling Market Stats' },
] as const;
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
 * Network configuration
 */
export const NETWORKS = {
  MAINNET: {
    name: 'Mainnet',
    apiParam: 'mainnet',
    icon: '/images/logo.png',
  },
  SEPOLIA: {
    name: 'Sepolia',
    apiParam: 'sepolia',
    icon: '/images/logo.png',
  }
};

export const DEFAULT_NETWORK = NETWORKS.MAINNET;

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
