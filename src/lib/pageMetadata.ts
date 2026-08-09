import type { Metadata } from 'next';
import {
  CHART_PAGES,
  DEFAULT_NETWORK,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from '@/constants';
import { networkPath } from '@/utils';
import { OG_SIZE } from '@/lib/og/card';
import { OG_NETWORK_PARAM } from '@/lib/og/params';
import { DEFAULT_TIME_RANGE, TIME_RANGE_PARAM, type TimeRange } from '@/lib/timeRange';

/**
 * Page metadata shared by the bare routes (default network) and the
 * network-scoped copies under /[network], so a page's title, canonical URL,
 * and Open Graph card are defined once and only differ by which network and
 * time range they name.
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

interface OgImageOptions {
  /** Named on the card, and read by the image route to pick the data source. */
  network?: string;
  /** Window the card reports over. Only pages with a time filter pass one. */
  range?: TimeRange;
  /** Card title, defaulting to the site title. */
  title?: string;
}

/**
 * Open Graph and Twitter tags pointing at a dynamic image route.
 *
 * The image routes are route handlers rather than opengraph-image file
 * conventions because a card depends on the network and time range the page
 * is showing: file conventions receive no query params, and the tags they
 * generate would override these. Both params are omitted at their defaults so
 * the common URLs stay clean, and the routes re-validate whatever arrives.
 *
 * Next replaces the whole openGraph and twitter objects per segment rather
 * than deep-merging them, so the site-wide strings are restated here.
 */
function ogImage(
  path: string,
  alt: string,
  { network, range, title = SITE_TITLE }: OgImageOptions = {}
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const params = new URLSearchParams();
  const slug = network?.toLowerCase();
  if (slug && slug !== DEFAULT_NETWORK.apiParam && NETWORK_SEGMENT_PATTERN.test(slug)) {
    params.set(OG_NETWORK_PARAM, slug);
  }
  if (range && range !== DEFAULT_TIME_RANGE) {
    params.set(TIME_RANGE_PARAM, range);
  }

  const query = params.toString();
  const image = {
    url: `${path}${query ? `?${query}` : ''}`,
    width: OG_SIZE.width,
    height: OG_SIZE.height,
    alt,
  };

  return {
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description: SITE_DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
      images: [image],
    },
  };
}

/**
 * Site-wide Open Graph tags for the root layout: the dynamic home card at its
 * defaults. Pages that describe something more specific replace this, and any
 * route without its own metadata still unfurls as a branded live card.
 */
export function defaultOgMetadata(): Pick<Metadata, 'openGraph' | 'twitter'> {
  return ogImage(
    '/opengraph-image',
    'BlobFlow: live Ethereum blob base fee and top rollup blob shares'
  );
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

export function homeMetadata(network?: string, range?: TimeRange): Metadata {
  const suffix = titleSuffix(network);
  const title = suffix ? `Real-Time Ethereum Blob Analytics${suffix}` : SITE_TITLE;

  return {
    // The default network's dashboard keeps the site-wide title.
    ...(suffix ? { title } : {}),
    alternates: canonical('/', network),
    ...ogImage(
      '/opengraph-image',
      'BlobFlow: live Ethereum blob base fee and top rollup blob shares',
      { network, range, title }
    ),
  };
}

export function blocksMetadata(network?: string): Metadata {
  const title = `Latest Blocks & Blob Fees${titleSuffix(network)}`;
  return {
    title,
    description:
      'Browse recent Ethereum blocks in real time with live blob counts, blob base fees, and per-blob details.',
    alternates: canonical('/blocks', network),
    // No card of its own; the branded home card, scoped to this network.
    ...ogImage('/opengraph-image', 'BlobFlow: live Ethereum blob analytics', {
      network,
      title,
    }),
  };
}

export function mempoolMetadata(network?: string): Metadata {
  const suffix = titleSuffix(network);
  return {
    // The bare mempool page has never set a title; only the scoped copies need
    // one, to say which network's pending transactions they list.
    ...(suffix ? { title: `Pending Blob Transactions${suffix}` } : {}),
    alternates: canonical('/mempool', network),
    ...ogImage('/opengraph-image', 'BlobFlow: live Ethereum blob analytics', {
      network,
      title: suffix ? `Pending Blob Transactions${suffix}` : SITE_TITLE,
    }),
  };
}

export function blockMetadata(blockNumber: string, network?: string): Metadata {
  const title = `Block ${blockNumber} Blob Details${titleSuffix(network)}`;
  return {
    title,
    alternates: canonical(`/block/${blockNumber}`, network),
    ...ogImage(
      `/block/${encodeURIComponent(blockNumber)}/opengraph-image`,
      'BlobFlow: blob details for an Ethereum block',
      { network, title }
    ),
  };
}

export function userMetadata(address: string, network?: string): Metadata {
  const title = `Blob Activity · ${shortAddress(address)}${titleSuffix(network)}`;
  return {
    title,
    alternates: canonical(`/user/${address}`, network),
    ...ogImage(
      `/user/${encodeURIComponent(address)}/opengraph-image`,
      'BlobFlow: blob activity for an Ethereum address',
      { network, title }
    ),
  };
}

export function transactionMetadata(hash: string, network?: string): Metadata {
  // The page reads hashes case-insensitively, so the canonical URL uses the
  // lowercase spelling and every casing of one hash points at a single page.
  const canonicalHash = /^0x[0-9a-f]{64}$/i.test(hash) ? hash.toLowerCase() : hash;
  const title = `Blob Transaction · ${shortTxHash(canonicalHash)}${titleSuffix(network)}`;
  return {
    title,
    alternates: canonical(`/tx/${canonicalHash}`, network),
    ...ogImage('/opengraph-image', 'BlobFlow: live Ethereum blob analytics', {
      network,
      title,
    }),
  };
}

export function chartMetadata(chart: string, network?: string, range?: TimeRange): Metadata {
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  const title = `${page?.title ?? 'Charts'}${titleSuffix(network)}`;
  return {
    title,
    alternates: canonical(`/charts/${chart}`, network),
    ...ogImage(
      `/charts/${encodeURIComponent(chart)}/opengraph-image`,
      'BlobFlow chart: live Ethereum blob market stats',
      { network, range, title }
    ),
  };
}
