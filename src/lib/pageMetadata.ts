import type { Metadata } from 'next';
import {
  CHART_PAGES,
  DEFAULT_NETWORK,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
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
  slugifyEntity,
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
export function networkTitleSuffix(network?: string): string {
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
 * The network a card URL should name. Well-formed slugs pass through so a
 * card can report on any network the deployment serves, not just the
 * bootstrap two; anything else falls back to the default.
 */
function cardNetworkSlug(network?: string): string {
  const slug = network?.toLowerCase();
  return slug && NETWORK_SEGMENT_PATTERN.test(slug) ? slug : DEFAULT_NETWORK.apiParam;
}

/** How a network is named in card alt text. */
function cardNetworkName(network?: string): string {
  return networkLabel(network) ?? DEFAULT_NETWORK.name;
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
  // The slug passes through rather than being narrowed to a bootstrap
  // network: this page only rendered because the layout confirmed the network
  // is served, and narrowing here would point a card for any other served
  // network at mainnet's data. The route resolves it against the served list
  // before reading anything.
  const params = new URLSearchParams({ network: cardNetworkSlug(network) });
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
  const suffix = networkTitleSuffix(network);
  const title = suffix ? `Real-Time Ethereum Blob Analytics${suffix}` : SITE_TITLE;
  const cardNetwork = cardNetworkName(network);

  return {
    // The default network's dashboard keeps the site-wide title.
    ...(suffix ? { title } : {}),
    alternates: canonical('/', network),
    // The dashboard's card reports over the header's range, so a shared link
    // unfurls the window the sharer was looking at.
    ...statCard(
      '/api/og/home',
      `Live blob base fee and top rollup shares on ${cardNetwork}, from ${SITE_NAME}`,
      { network, range: range ?? '', title }
    ),
  };
}

export function blocksMetadata(network?: string): Metadata {
  const title = `Latest Blocks & Blob Fees${networkTitleSuffix(network)}`;
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
  const title = `Pending Blob Transactions${networkTitleSuffix(network)}`;
  const description =
    'Watch pending EIP-4844 blob transactions in the Ethereum mempool: which rollups ' +
    'are queuing data, their fee bids, and blobspace pressure before the next block.';
  return {
    title,
    description,
    alternates: canonical('/mempool', network),
    ...statCard('/api/og/home', `Live Ethereum blob analytics on ${SITE_NAME}`, {
      network,
      title,
      description,
    }),
  };
}

export function usersMetadata(network?: string): Metadata {
  const title = `Top Blob Users${networkTitleSuffix(network)}`;
  const description =
    'Leaderboard of Ethereum blob users: rollups and other senders ranked by blobs posted, ' +
    'share of blobspace, and total spend, from the last hour to all time.';
  return {
    title,
    description,
    alternates: canonical('/users', network),
    // No card of its own, so it shares the dashboard's, scoped to this network.
    ...statCard('/api/og/home', `Live Ethereum blob analytics on ${SITE_NAME}`, {
      network,
      title,
      description,
    }),
  };
}

export function recordsMetadata(network?: string): Metadata {
  return {
    title: `Blob Market Records${networkTitleSuffix(network)}`,
    description:
      'Records and milestones from the Ethereum EIP-4844 blob market: live full-block streaks, peak windowed base fees, busiest windows, biggest spenders, and per-rollup blob milestones.',
    alternates: canonical('/records', network),
  };
}

export function flippeningMetadata(network?: string): Metadata {
  return {
    title: `Flippening Watch${networkTitleSuffix(network)}`,
    description:
      'Track when one rollup overtakes another in Ethereum blob share: recent crossover events and the pair closest to flipping.',
    alternates: canonical('/flippening', network),
  };
}

export function liveMetadata(network?: string): Metadata {
  const title = `TV Mode: Live Blob Market${networkTitleSuffix(network)}`;
  const description =
    'Full-screen live view of the Ethereum blob market: current blob base fee, next-block ' +
    'prediction, blobspace fullness, and the rollups filling recent blocks. Built for ' +
    'conference screens and stream overlays.';
  return {
    title,
    description,
    alternates: canonical('/live', network),
    // No card of its own, so it shares the dashboard's, scoped to this network.
    ...statCard(
      '/api/og/home',
      `Live Ethereum blob analytics on ${cardNetworkName(network)}, from ${SITE_NAME}`,
      { network, title, description }
    ),
  };
}

export function blockMetadata(blockNumber: string, network?: string): Metadata {
  const title = `Block ${blockNumber} Blob Details${networkTitleSuffix(network)}`;
  const cardNetwork = cardNetworkName(network);
  // The card route serves one URL per card, so a number that is not already
  // canonical (leading zeros, non-numeric) gets no card rather than a 404 one.
  const cardBlockNumber = /^(0|[1-9]\d*)$/.test(blockNumber) ? blockNumber : null;

  const description =
    `Blob activity in Ethereum block ${blockNumber}: blob count, blob base fee, ` +
    'and per-blob size, sender, and cost.';

  return {
    title,
    description,
    alternates: canonical(`/block/${blockNumber}`, network),
    ...(cardBlockNumber
      ? statCard(
          `/api/og/block/${cardBlockNumber}`,
          `Blob details for block ${blockNumber} on ${cardNetwork}, from ${SITE_NAME}`,
          { network, title, description }
        )
      : {}),
  };
}

export function entityMetadata(entity: string, network?: string): Metadata {
  const slug = slugifyEntity(entity);
  // The name comes from the slug rather than a lookup, like the stat card
  // pages: metadata must not depend on the indexer being reachable.
  const name = slug ? titleCaseSlug(slug) : 'Entity';
  const title = `${name} Blob Activity${networkTitleSuffix(network)}`;
  const description =
    `Aggregated EIP-4844 blob activity for ${name} across every sender address ` +
    'attributed to it: blobs posted, ETH spent on blob fees, and a per-address breakdown.';

  return {
    title,
    description,
    alternates: canonical(`/entity/${slug || entity}`, network),
    // No card of its own, so it shares the dashboard's, scoped to this network.
    ...statCard('/api/og/home', `Live Ethereum blob analytics on ${SITE_NAME}`, {
      network,
      title,
      description,
    }),
  };
}

export function userMetadata(address: string, network?: string): Metadata {
  const title = `Blob Activity · ${shortAddress(address)}${networkTitleSuffix(network)}`;
  const cardNetwork = cardNetworkName(network);
  // Same one-URL-per-card rule: the card route only answers for the lowercase
  // spelling, so every casing of an address points at a single image.
  const cardAddress = /^0x[0-9a-f]{40}$/i.test(address) ? address.toLowerCase() : null;

  const description =
    `Blob transaction history for ${shortAddress(address)}: blobs posted, ` +
    'ETH spent on blob fees, and recent EIP-4844 activity on Ethereum.';

  return {
    title,
    description,
    alternates: canonical(`/user/${address}`, network),
    ...(cardAddress
      ? statCard(
          `/api/og/user/${cardAddress}`,
          `Blob activity for ${shortAddress(address)} on ${cardNetwork}, from ${SITE_NAME}`,
          { network, title, description }
        )
      : {}),
  };
}

export function transactionMetadata(hash: string, network?: string): Metadata {
  // The page reads hashes case-insensitively, so the canonical URL uses the
  // lowercase spelling and every casing of one hash points at a single page.
  const canonicalHash = /^0x[0-9a-f]{64}$/i.test(hash) ? hash.toLowerCase() : hash;
  const title = `Blob Transaction · ${shortTxHash(canonicalHash)}${networkTitleSuffix(network)}`;
  const description =
    `Details for Ethereum blob transaction ${shortTxHash(canonicalHash)}: blobs ` +
    'carried, blob fees paid, and the block that included it.';
  return {
    title,
    description,
    alternates: canonical(`/tx/${canonicalHash}`, network),
    // No card of its own, so it shares the dashboard's, scoped to this network.
    ...statCard(
      '/api/og/home',
      `Live Ethereum blob analytics on ${cardNetworkName(network)}, from ${SITE_NAME}`,
      { network, title, description }
    ),
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
  const title = `${cardHeadline(params, entityName)}${networkTitleSuffix(network)}`;
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
  const title = `${page?.title ?? 'Charts'}${networkTitleSuffix(network)}`;

  // An unserved chart renders a "not found" view, so it advertises no
  // description and no card of its own.
  if (!page) {
    return { title, alternates: canonical(`/charts/${chart}`, network) };
  }

  const cardRange = parseTimeRange(range, OG_CARD_DEFAULT_RANGE);
  const cardUrl = `/api/og/chart/${chart}?range=${cardRange}&network=${cardNetworkSlug(network)}`;
  const cardAlt = `${page.title}: ${cardNetworkName(network)} over the last ${cardRange} on ${SITE_NAME}`;

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
