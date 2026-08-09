import type { Metadata } from 'next';
import {
  CHART_PAGES,
  DEFAULT_NETWORK,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  parseNetwork,
  parseTimeRange,
} from '@/constants';
import { networkPath } from '@/utils';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';

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
 * Social card tags for the pages whose card is a live stat card rather than a
 * plotted chart: the dashboard, a block, and a sender. Same shape as
 * chartMetadata's, so every page unfurls as a large image.
 *
 * Like the chart card, these are route handlers rather than opengraph-image
 * file conventions: that convention only receives route params, and a card
 * has to honor the network (and, on the dashboard, the range) the URL names.
 */
function statCard(
  path: string,
  alt: string,
  { network, range, title = SITE_TITLE, description = SITE_DESCRIPTION }: {
    network?: string;
    range?: string;
    title?: string;
    description?: string;
  } = {}
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const cardNetwork = parseNetwork(network);
  const params = new URLSearchParams({ network: cardNetwork.apiParam });
  if (range !== undefined) {
    // Same fallback as the chart card: a card read at a glance wants a window
    // wider than the dashboard's live default.
    params.set('range', parseTimeRange(range, OG_CARD_DEFAULT_RANGE));
  }

  const url = `${path}?${params.toString()}`;

  return {
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url, alt }],
    },
  };
}

/**
 * Site-wide card for the root layout: the dashboard card at its defaults, so
 * a route with no metadata of its own still unfurls as a branded live card
 * rather than a bare logo.
 */
export function defaultOgMetadata(): Pick<Metadata, 'openGraph' | 'twitter'> {
  return statCard(
    '/api/og/home',
    `Live blob base fee and top rollup shares on ${SITE_NAME}`
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

export function homeMetadata(network?: string, range?: string): Metadata {
  const suffix = titleSuffix(network);
  const title = suffix ? `Real-Time Ethereum Blob Analytics${suffix}` : SITE_TITLE;
  const cardNetwork = parseNetwork(network);

  return {
    // The default network's dashboard keeps the site-wide title.
    ...(suffix ? { title } : {}),
    alternates: canonical('/', network),
    // The dashboard's card reports over the header's range, so a shared link
    // unfurls the window the sharer was looking at.
    ...statCard(
      '/api/og/home',
      `Live blob base fee and top rollup shares on ${cardNetwork.name}, from ${SITE_NAME}`,
      { network, range: range ?? '', title }
    ),
  };
}

export function blocksMetadata(network?: string): Metadata {
  const title = `Latest Blocks & Blob Fees${titleSuffix(network)}`;
  const description =
    'Browse recent Ethereum blocks in real time with live blob counts, blob base fees, and per-blob details.';
  return {
    title,
    description,
    alternates: canonical('/blocks', network),
    // No card of its own, so it shares the dashboard's, scoped to this network.
    ...statCard('/api/og/home', `Live Ethereum blob analytics on ${SITE_NAME}`, {
      network,
      title,
      description,
    }),
  };
}

export function mempoolMetadata(network?: string): Metadata {
  const suffix = titleSuffix(network);
  const title = suffix ? `Pending Blob Transactions${suffix}` : SITE_TITLE;
  return {
    // The bare mempool page has never set a title; only the scoped copies need
    // one, to say which network's pending transactions they list.
    ...(suffix ? { title: `Pending Blob Transactions${suffix}` } : {}),
    alternates: canonical('/mempool', network),
    ...statCard('/api/og/home', `Live Ethereum blob analytics on ${SITE_NAME}`, {
      network,
      title,
    }),
  };
}

export function liveMetadata(network?: string): Metadata {
  return {
    title: `TV Mode: Live Blob Market${titleSuffix(network)}`,
    description:
      'Full-screen live view of the Ethereum blob market: current blob base fee, next-block ' +
      'prediction, blobspace fullness, and the rollups filling recent blocks. Built for ' +
      'conference screens and stream overlays.',
    alternates: canonical('/live', network),
  };
}

export function blockMetadata(blockNumber: string, network?: string): Metadata {
  const title = `Block ${blockNumber} Blob Details${titleSuffix(network)}`;
  const cardNetwork = parseNetwork(network);
  return {
    title,
    alternates: canonical(`/block/${blockNumber}`, network),
    ...statCard(
      `/api/og/block/${encodeURIComponent(blockNumber)}`,
      `Blob details for block ${blockNumber} on ${cardNetwork.name}, from ${SITE_NAME}`,
      { network, title }
    ),
  };
}

export function userMetadata(address: string, network?: string): Metadata {
  const title = `Blob Activity · ${shortAddress(address)}${titleSuffix(network)}`;
  const cardNetwork = parseNetwork(network);
  return {
    title,
    alternates: canonical(`/user/${address}`, network),
    ...statCard(
      `/api/og/user/${encodeURIComponent(address)}`,
      `Blob activity for ${shortAddress(address)} on ${cardNetwork.name}, from ${SITE_NAME}`,
      { network, title }
    ),
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

/**
 * Chart metadata, including the social share card. The card is generated per
 * chart, range, and network so a shared link unfurls the view the sharer was
 * looking at; `range` comes from the URL's query string, which is why this is
 * called from the pages rather than a layout (layouts never see searchParams).
 */
export function chartMetadata(
  chart: string,
  network?: string,
  range?: string
): Metadata {
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  const title = `${page?.title ?? 'Charts'}${titleSuffix(network)}`;

  // An unserved chart renders a "not found" view, so it advertises no
  // description and no card of its own.
  if (!page) {
    return { title, alternates: canonical(`/charts/${chart}`, network) };
  }

  const cardRange = parseTimeRange(range, OG_CARD_DEFAULT_RANGE);
  const cardNetwork = parseNetwork(network);
  const cardUrl = `/api/og/chart/${chart}?range=${cardRange}&network=${cardNetwork.apiParam}`;
  const cardAlt = `${page.title}: ${cardNetwork.name} over the last ${cardRange} on ${SITE_NAME}`;

  return {
    title,
    description: page.description,
    alternates: canonical(`/charts/${chart}`, network),
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description: page.description,
      url: networkPath(`/charts/${chart}`, network),
      images: [{ url: cardUrl, width: 1200, height: 630, alt: cardAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: page.description,
      images: [{ url: cardUrl, alt: cardAlt }],
    },
  };
}
