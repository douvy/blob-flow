/**
 * Model behind the /card stat card composer.
 *
 * Everything here is pure so the client composer and the server-rendered Open
 * Graph image derive the same card from the same query string, which is what
 * makes a shared link reproduce what its author saw. Every value that reaches
 * the card from the URL is validated here first: unknown entities, ranges,
 * metrics, and networks fall back to defaults instead of rendering.
 */
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendChartRange,
  BackendCostComparisonChartResponse,
} from '@/types';
import { DEFAULT_NETWORK, parseNetwork } from '@/constants';
import {
  formatBlobWeiCost,
  formatGwei,
  formatNumber,
  formatPercent,
  formatWeiToEth,
  getAttributionImageSrc,
  networkPath,
} from '@/utils';

/**
 * Ranges the attribution and cost endpoints accept. This is a wider set than
 * the header's TIME_RANGES: a card is a standalone artifact rather than a view
 * of the dashboard, and "all time" is the range people most want to brag with.
 */
export const CARD_RANGES = ['1h', '24h', '7d', '30d', 'all'] as const satisfies readonly BackendChartRange[];

export type CardRange = (typeof CARD_RANGES)[number];

export const DEFAULT_CARD_RANGE: CardRange = '7d';

export const CARD_RANGE_LABELS: Record<CardRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

/** Short form for the composer's range buttons. */
export const CARD_RANGE_SHORT_LABELS: Record<CardRange, string> = {
  '1h': '1H',
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  all: 'All',
};

/** Sentinel entity for a card about the whole blob market rather than one sender. */
export const NETWORK_WIDE_ENTITY = 'network';
export const NETWORK_WIDE_NAME = 'Ethereum blobspace';

export const DEFAULT_CARD_NETWORK = DEFAULT_NETWORK.apiParam;

export type MetricId =
  | 'blob-share'
  | 'spend-share'
  | 'blob-count'
  | 'eth-spent'
  | 'avg-cost-per-blob'
  | 'savings-vs-calldata'
  | 'base-fee';

/**
 * Which kind of card a metric belongs on. Shares only mean something for a
 * single sender, and the calldata comparison is only published market-wide,
 * so each is offered on just the card where it is true.
 */
export type MetricScope = 'entity' | 'network' | 'any';

export interface CardMetric {
  id: MetricId;
  /** Row label on the card itself. */
  label: string;
  /** One-line explanation shown next to the composer's checkbox. */
  hint: string;
  scope: MetricScope;
}

export const CARD_METRICS: readonly CardMetric[] = [
  {
    id: 'blob-share',
    label: 'Blob share',
    hint: 'Share of all blobs posted in the range',
    scope: 'entity',
  },
  {
    id: 'spend-share',
    label: 'Spend share',
    hint: 'Share of all blob fees paid in the range',
    scope: 'entity',
  },
  {
    id: 'blob-count',
    label: 'Blobs posted',
    hint: 'Number of blobs posted in the range',
    scope: 'any',
  },
  {
    id: 'eth-spent',
    label: 'ETH spent',
    hint: 'Total blob fees paid in the range',
    scope: 'any',
  },
  {
    id: 'avg-cost-per-blob',
    label: 'Avg cost per blob',
    hint: 'Total spend divided by blobs posted',
    scope: 'any',
  },
  {
    id: 'savings-vs-calldata',
    label: 'Saved vs calldata',
    hint: 'Market-wide saving against posting the same bytes as calldata',
    scope: 'network',
  },
  {
    id: 'base-fee',
    label: 'Blob base fee',
    hint: 'Blob base fee at the latest indexed block',
    scope: 'any',
  },
];

export const MAX_CARD_METRICS = 3;
export const MIN_CARD_METRICS = 2;

const DEFAULT_ENTITY_METRICS: readonly MetricId[] = ['blob-share', 'eth-spent'];
const DEFAULT_NETWORK_METRICS: readonly MetricId[] = ['blob-count', 'eth-spent'];

export interface CardParams {
  /** Entity slug, or NETWORK_WIDE_ENTITY for a market-wide card. */
  entity: string;
  range: CardRange;
  metrics: MetricId[];
  /**
   * Network apiParam. On the page this comes from the route segment
   * (`/sepolia/card`); the image route takes it as a query param, since a
   * route handler has no network segment of its own.
   */
  network: string;
}

interface ParamGetter {
  get(key: string): string | null;
}

/** Accepts both URLSearchParams (client) and Next's searchParams object (server). */
export type CardParamSource = ParamGetter | Record<string, string | string[] | undefined>;

const METRIC_IDS = new Set<string>(CARD_METRICS.map((metric) => metric.id));
const MAX_SLUG_LENGTH = 40;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Reduce an entity name or key to a URL-safe slug. The result only ever
 * contains [a-z0-9-], so anything built from it (query strings, React text,
 * satori text) is safe without further escaping.
 */
export function slugifyEntity(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');

  return SLUG_PATTERN.test(slug) ? slug : '';
}

function readParam(source: CardParamSource, key: string): string | undefined {
  const getter = source as Partial<ParamGetter>;
  if (typeof getter.get === 'function') {
    return getter.get(key) ?? undefined;
  }

  const value = (source as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseRange(raw: string | undefined): CardRange {
  const candidate = raw?.trim().toLowerCase();
  return CARD_RANGES.find((range) => range === candidate) ?? DEFAULT_CARD_RANGE;
}

/**
 * The card's network, narrowed to one the deployment ships with. Share
 * rendering happens without a session, so it stays on that finite set rather
 * than forwarding an arbitrary string to the backend (same reasoning as the
 * chart share cards).
 */
function parseCardNetwork(raw: string | undefined): string {
  return parseNetwork(raw?.trim().toLowerCase()).apiParam;
}

/** True when this metric can be shown on the given kind of card. */
export function metricAppliesTo(metric: CardMetric, isNetworkWide: boolean): boolean {
  if (metric.scope === 'any') return true;
  return metric.scope === (isNetworkWide ? 'network' : 'entity');
}

export function availableMetrics(isNetworkWide: boolean): CardMetric[] {
  return CARD_METRICS.filter((metric) => metricAppliesTo(metric, isNetworkWide));
}

export function defaultMetrics(isNetworkWide: boolean): MetricId[] {
  return [...(isNetworkWide ? DEFAULT_NETWORK_METRICS : DEFAULT_ENTITY_METRICS)];
}

function parseMetrics(raw: string | undefined, isNetworkWide: boolean): MetricId[] {
  const requested = (raw ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is MetricId => METRIC_IDS.has(entry));

  const showable = new Set(availableMetrics(isNetworkWide).map((metric) => metric.id));

  // Keep the author's order, minus duplicates and anything this card cannot show.
  const ordered = [...new Set(requested)].filter((id) => showable.has(id));

  return ordered.length > 0 ? ordered.slice(0, MAX_CARD_METRICS) : defaultMetrics(isNetworkWide);
}

/**
 * Validate a card's query string. Never throws and never returns a value the
 * card cannot render.
 *
 * @param networkSegment The page's network segment, which wins over any
 * `network` in the query: the page carries the network in its path, and only
 * the image route passes it alongside the rest of the card.
 */
export function parseCardParams(
  source: CardParamSource,
  networkSegment?: string
): CardParams {
  const entity = slugifyEntity(readParam(source, 'entity') ?? '') || NETWORK_WIDE_ENTITY;
  const isNetworkWide = entity === NETWORK_WIDE_ENTITY;

  return {
    entity,
    range: parseRange(readParam(source, 'range')),
    metrics: parseMetrics(readParam(source, 'metrics'), isNetworkWide),
    network: parseCardNetwork(networkSegment ?? readParam(source, 'network')),
  };
}

/**
 * Re-validate params the composer assembled itself, so a change of entity
 * cannot leave a metric behind that the new card has no data for.
 */
export function normalizeCardParams(params: CardParams): CardParams {
  return parseCardParams(
    new URLSearchParams({
      entity: params.entity,
      range: params.range,
      metrics: params.metrics.join(','),
    }),
    params.network
  );
}

function cardQueryString(params: CardParams): string {
  return new URLSearchParams({
    entity: params.entity,
    range: params.range,
    metrics: params.metrics.join(','),
  }).toString();
}

/**
 * The card's page. The network rides in the path, the way every other page
 * names its network, so the default network keeps the bare `/card`.
 */
export function buildCardHref(params: CardParams): string {
  return networkPath(`/card?${cardQueryString(params)}`, params.network);
}

/** Path of the Open Graph image rendering the same card. */
export function buildCardImagePath(params: CardParams): string {
  return `/api/og/card?${cardQueryString(params)}&network=${params.network}`;
}

const MAX_ENTITY_NAME_LENGTH = 28;

/**
 * Entity names come from the indexer, so clamp them to something a card can
 * lay out and strip control characters before they reach a renderer.
 */
export function sanitizeEntityName(name: string): string {
  const cleaned = name
    // Control characters would render as blanks or break card layout.
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Unknown sender';

  return cleaned.length > MAX_ENTITY_NAME_LENGTH
    ? `${cleaned.slice(0, MAX_ENTITY_NAME_LENGTH - 1)}…`
    : cleaned;
}

/** Readable name for a slug we could not match against live data. */
export function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface CardEntity {
  slug: string;
  name: string;
  /** Bundled logo path, or null when the entity has none. */
  iconSrc: string | null;
  isNetworkWide: boolean;
}

export const NETWORK_WIDE_CARD_ENTITY: CardEntity = {
  slug: NETWORK_WIDE_ENTITY,
  name: NETWORK_WIDE_NAME,
  iconSrc: null,
  isNetworkWide: true,
};

/** Shares ordered as the composer's entity picker lists them. */
export function cardEntityOptions(
  attribution: BackendAttributionUsageChartResponse | null | undefined
): CardEntity[] {
  const shares = attribution?.summary?.shares ?? [];
  const seen = new Set<string>();

  return shares
    .map((share) => ({ share, slug: shareSlug(share) }))
    .filter(({ slug }) => {
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .sort((a, b) => b.share.blob_share_percent - a.share.blob_share_percent)
    .map(({ share, slug }) => ({
      slug,
      name: sanitizeEntityName(share.name),
      iconSrc: getAttributionImageSrc(share.name),
      isNetworkWide: false,
    }));
}

/**
 * Canonical slug for a share. The display name comes first because links are
 * the point of this page and "base" reads better than an address key, which is
 * what the backend uses for senders it has no name for.
 */
function shareSlug(share: BackendAttributionUsageShare): string {
  return slugifyEntity(share.name) || slugifyEntity(share.key);
}

function findShare(
  attribution: BackendAttributionUsageChartResponse | null | undefined,
  slug: string
): BackendAttributionUsageShare | null {
  const shares = attribution?.summary?.shares ?? [];
  return (
    shares.find(
      // Match the key too, so a link built before an entity was named still resolves.
      (share) => shareSlug(share) === slug || slugifyEntity(share.key) === slug
    ) ?? null
  );
}

/**
 * Turn the validated entity slug into what the card renders. An entity the
 * live data does not know about degrades to the market-wide card; while the
 * data is still loading the slug stands in for the name so the card does not
 * flash the wrong title.
 */
export function resolveCardEntity(
  attribution: BackendAttributionUsageChartResponse | null | undefined,
  slug: string
): CardEntity {
  if (slug === NETWORK_WIDE_ENTITY) return NETWORK_WIDE_CARD_ENTITY;

  const share = findShare(attribution, slug);
  if (share) {
    return {
      slug,
      name: sanitizeEntityName(share.name),
      iconSrc: getAttributionImageSrc(share.name),
      isNetworkWide: false,
    };
  }

  if (!attribution) {
    return { slug, name: titleCaseSlug(slug), iconSrc: null, isNetworkWide: false };
  }

  return NETWORK_WIDE_CARD_ENTITY;
}

export interface CardSources {
  attribution?: BackendAttributionUsageChartResponse | null;
  costComparison?: BackendCostComparisonChartResponse | null;
  /** Current blob base fee in gwei, from GET /blob/pricing. */
  baseFeeGwei?: string | null;
}

export interface CardStat {
  id: MetricId;
  label: string;
  value: string;
}

/** Placeholder for a metric whose endpoint returned nothing usable. */
const NO_VALUE = '-';

function safeValue(compute: () => string | null): string {
  try {
    return compute() ?? NO_VALUE;
  } catch {
    return NO_VALUE;
  }
}

/** Integer wei per blob, as a string, or null when it cannot be divided. */
function averageWeiPerBlob(totalCostWei: string, blobCount: number): string | null {
  if (!Number.isFinite(blobCount) || blobCount <= 0) return null;

  // Wei totals are integers; drop any fractional part so BigInt can parse them.
  const wholeWei = totalCostWei.trim().split('.')[0];
  if (!/^\d+$/.test(wholeWei)) return null;

  return (BigInt(wholeWei) / BigInt(Math.floor(blobCount))).toString();
}

interface MetricContext {
  share: BackendAttributionUsageShare | null;
  totalBlobs: number | null;
  totalCostWei: string | null;
  sources: CardSources;
}

function metricValue(id: MetricId, context: MetricContext): string {
  const { share, totalBlobs, totalCostWei, sources } = context;

  switch (id) {
    case 'blob-share':
      return safeValue(() => (share ? formatPercent(share.blob_share_percent) : null));
    case 'spend-share':
      return safeValue(() => (share ? formatPercent(share.spend_share_percent) : null));
    case 'blob-count':
      return safeValue(() => (totalBlobs === null ? null : formatNumber(totalBlobs)));
    case 'eth-spent':
      return safeValue(() => (totalCostWei === null ? null : formatWeiToEth(totalCostWei, true)));
    case 'avg-cost-per-blob':
      return safeValue(() => {
        if (totalCostWei === null || totalBlobs === null) return null;
        const average = averageWeiPerBlob(totalCostWei, totalBlobs);
        return average === null ? null : formatBlobWeiCost(average);
      });
    case 'savings-vs-calldata':
      return safeValue(() => {
        const summary = sources.costComparison?.summary;
        return summary ? formatPercent(summary.savings_percent) : null;
      });
    case 'base-fee':
      return safeValue(() =>
        sources.baseFeeGwei ? formatGwei(sources.baseFeeGwei, 4) : null
      );
  }
}

/**
 * The stat rows for a card, in the order its URL asked for them. Metrics whose
 * data has not arrived (or failed) render as "-" rather than dropping out, so
 * the card keeps the shape the link promised.
 */
export function deriveCardStats(params: CardParams, sources: CardSources): CardStat[] {
  const isNetworkWide = params.entity === NETWORK_WIDE_ENTITY;
  const share = isNetworkWide ? null : findShare(sources.attribution, params.entity);
  const summary = sources.attribution?.summary;

  const totalBlobs = share ? share.blob_count : summary ? summary.total_blobs : null;
  const totalCostWei = share ? share.total_cost_wei : summary ? summary.total_cost_wei : null;

  const context: MetricContext = { share, totalBlobs, totalCostWei, sources };

  return params.metrics.map((id) => ({
    id,
    label: CARD_METRICS.find((metric) => metric.id === id)?.label ?? id,
    value: metricValue(id, context),
  }));
}

export interface ResolvedCard {
  entity: CardEntity;
  stats: CardStat[];
}

/**
 * Everything a renderer needs for one card. Resolving the entity can change
 * which card this is (an entity the data no longer knows becomes the
 * market-wide card), so the metric list is re-validated against the entity we
 * ended up with rather than the one the link asked for.
 */
export function resolveCard(params: CardParams, sources: CardSources): ResolvedCard {
  const entity = resolveCardEntity(sources.attribution, params.entity);
  const effective =
    entity.slug === params.entity
      ? params
      : normalizeCardParams({ ...params, entity: entity.slug });

  return { entity, stats: deriveCardStats(effective, sources) };
}

/** Which endpoints a set of metrics actually needs, so the card fetches no more. */
export function cardDataNeeds(metrics: MetricId[]): {
  costComparison: boolean;
  pricing: boolean;
} {
  return {
    costComparison: metrics.includes('savings-vs-calldata'),
    pricing: metrics.includes('base-fee'),
  };
}

/** Page title and social description for a card link. */
export function cardHeadline(params: CardParams, entityName: string): string {
  return `${entityName} blob stats · ${CARD_RANGE_LABELS[params.range]}`;
}
