import type { Metadata } from 'next';
import { CHART_PAGES, DEFAULT_NETWORK } from '@/constants';
import { networkPath } from '@/utils';

/**
 * Page metadata shared by the bare routes (default network) and the
 * network-scoped copies under /[network], so a page's title and canonical URL
 * are defined once and only differ by which network they name.
 */

const NETWORK_SEGMENT_PATTERN = /^[a-z0-9-]{1,32}$/;

function networkLabel(network?: string): string | null {
  if (!network) return null;
  const slug = network.toLowerCase();
  if (!NETWORK_SEGMENT_PATTERN.test(slug)) return null;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Suffix that names the network in a title, empty for the default network. */
function titleSuffix(network?: string): string {
  if (!network || network.toLowerCase() === DEFAULT_NETWORK.apiParam) return '';

  const label = networkLabel(network);
  return label ? ` · ${label}` : '';
}

function canonical(path: string, network?: string): Metadata['alternates'] {
  return { canonical: networkPath(path, network) };
}

function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 10)}…${address.slice(-4)}` : address;
}

function shortTxHash(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

/**
 * For a URL whose network segment names no served network. The route answers
 * 404, so it must not advertise a title or a canonical of its own: metadata is
 * generated even when the layout rejects the request.
 */
export function unknownNetworkMetadata(): Metadata {
  return {
    title: 'Not Found',
    robots: { index: false, follow: false },
  };
}

export function homeMetadata(network?: string): Metadata {
  const suffix = titleSuffix(network);
  return {
    // The default network's dashboard keeps the site-wide title.
    ...(suffix ? { title: `Real-Time Ethereum Blob Analytics${suffix}` } : {}),
    alternates: canonical('/', network),
  };
}

export function blocksMetadata(network?: string): Metadata {
  return {
    title: `Latest Blocks & Blob Fees${titleSuffix(network)}`,
    description:
      'Browse recent Ethereum blocks in real time with live blob counts, blob base fees, and per-blob details.',
    alternates: canonical('/blocks', network),
  };
}

export function mempoolMetadata(network?: string): Metadata {
  const suffix = titleSuffix(network);
  return {
    // The bare mempool page has never set a title; only the scoped copies need
    // one, to say which network's pending transactions they list.
    ...(suffix ? { title: `Pending Blob Transactions${suffix}` } : {}),
    alternates: canonical('/mempool', network),
  };
}

export function flippeningMetadata(network?: string): Metadata {
  return {
    title: `Flippening Watch${titleSuffix(network)}`,
    description:
      'Track when one rollup overtakes another in Ethereum blob share: recent crossover events and the pair closest to flipping.',
    alternates: canonical('/flippening', network),
  };
}

export function blockMetadata(blockNumber: string, network?: string): Metadata {
  return {
    title: `Block ${blockNumber} Blob Details${titleSuffix(network)}`,
    alternates: canonical(`/block/${blockNumber}`, network),
  };
}

export function userMetadata(address: string, network?: string): Metadata {
  return {
    title: `Blob Activity · ${shortAddress(address)}${titleSuffix(network)}`,
    alternates: canonical(`/user/${address}`, network),
  };
}

export function transactionMetadata(hash: string, network?: string): Metadata {
  // The page reads hashes case-insensitively, so the canonical URL uses the
  // lowercase spelling and every casing of one hash points at a single page.
  const canonicalHash = /^0x[0-9a-f]{64}$/i.test(hash) ? hash.toLowerCase() : hash;
  return {
    title: `Blob Transaction · ${shortTxHash(canonicalHash)}${titleSuffix(network)}`,
    alternates: canonical(`/tx/${canonicalHash}`, network),
  };
}

export function chartMetadata(chart: string, network?: string): Metadata {
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  return {
    title: `${page?.title ?? 'Charts'}${titleSuffix(network)}`,
    alternates: canonical(`/charts/${chart}`, network),
  };
}
