import type { Metadata } from 'next';
import {
  CHART_PAGES,
  DEFAULT_NETWORK,
  SITE_NAME,
  parseNetwork,
  parseTimeRange,
} from '@/constants';
import { networkPath } from '@/utils';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import {
  buildCardHref,
  buildCardImagePath,
  CARD_RANGE_LABELS,
  cardHeadline,
  NETWORK_WIDE_ENTITY,
  NETWORK_WIDE_NAME,
  parseCardParams,
  titleCaseSlug,
} from '@/lib/statCard';

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

export function recordsMetadata(network?: string): Metadata {
  return {
    title: `Blob Market Records${titleSuffix(network)}`,
    description:
      'Records and milestones from the Ethereum EIP-4844 blob market: live full-block streaks, peak windowed base fees, busiest windows, biggest spenders, and per-rollup blob milestones.',
    alternates: canonical('/records', network),
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

/**
 * Stat card metadata. The whole card lives in the link's query string, so the
 * share image is generated from those same validated params and a pasted link
 * unfurls into the card its author built. Called from the pages because only
 * they see searchParams.
 */
export function cardMetadata(
  searchParams: { [key: string]: string | string[] | undefined },
  network?: string
): Metadata {
  const params = parseCardParams(searchParams, network);
  const entityName =
    params.entity === NETWORK_WIDE_ENTITY ? NETWORK_WIDE_NAME : titleCaseSlug(params.entity);
  // The name comes from the slug rather than a lookup: metadata must not
  // depend on the indexer being reachable, and the image carries the real one.
  const title = `${cardHeadline(params, entityName)}${titleSuffix(network)}`;
  const description = `${entityName} blob activity, ${CARD_RANGE_LABELS[
    params.range
  ].toLowerCase()}, as a shareable ${SITE_NAME} stat card.`;
  const cardUrl = buildCardImagePath(params);

  return {
    title,
    description,
    alternates: { canonical: buildCardHref(params) },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: buildCardHref(params),
      images: [{ url: cardUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: cardUrl, alt: title }],
    },
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
