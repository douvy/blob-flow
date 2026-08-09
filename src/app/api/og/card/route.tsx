import { readFile } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { ImageResponse } from 'next/og';
import { ATTRIBUTION_ENTITY_LIMIT, SITE_NAME, SITE_URL } from '@/constants';
import { api } from '@/lib/api';
import { OG_CARD_CACHE_CONTROL } from '@/lib/og/card';
import { cardNotFound, hasCanonicalQuery, STAT_CARD_PARAMS } from '@/lib/og/request';
import { resolveCardNetwork } from '@/lib/serverNetworks';
import {
  CARD_RANGE_LABELS,
  cardDataNeeds,
  parseCardParams,
  resolveCard,
  type CardEntity,
  type CardParams,
  type CardSources,
  type CardStat,
} from '@/lib/statCard';
import type {
  BackendAttributionUsageChartResponse,
  BackendCostComparisonChartResponse,
} from '@/types';

/**
 * Social share card for stat card links (og:image, and X's
 * summary_large_image). The card is described entirely by its query string, so
 * this renders from the same validated params as the page and a pasted link
 * unfurls into the card its author built.
 *
 * This is a route handler rather than the opengraph-image file convention
 * because that convention only receives route params, and the whole card lives
 * in the query string.
 *
 * Because the query string is the whole card, a query naming a key this route
 * does not understand, or naming one twice, is refused rather than ignored:
 * every distinct URL is its own rasterization and its own CDN entry, so
 * ignoring junk would let one card be addressed unboundedly many ways.
 *
 * The layout mirrors src/components/card/StatCard.tsx at its native 1200x630;
 * satori has no Tailwind, so the styles here are inline and a design change
 * belongs in both files.
 *
 * Fonts are the site's woff (v1) files; satori does not accept woff2.
 */

export const size = { width: 1200, height: 630 };

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const PUBLIC_DIR = join(process.cwd(), 'public');

const ICON_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

/**
 * Inline an entity logo as a data URL. satori has no network stack of its own,
 * so bundled files are read rather than fetched. Unlike the fonts and the site
 * logo this is per-entity and optional, so a miss returns null and the card
 * falls back to the entity's initial.
 */
async function loadEntityIcon(publicPath: string | null): Promise<string | null> {
  if (!publicPath) return null;

  const mimeType = ICON_MIME_TYPES[extname(publicPath).toLowerCase()];
  if (!mimeType) return null;

  const absolutePath = join(PUBLIC_DIR, publicPath.replace(/^\/+/, ''));
  // These paths come from the generated icon map, never from the URL, but keep
  // the read inside public/ regardless.
  if (!absolutePath.startsWith(`${PUBLIC_DIR}${sep}`)) return null;

  try {
    const file = await readFile(absolutePath);
    return `data:${mimeType};base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Fetch only what the chosen metrics need, tolerating a backend that is down. */
async function loadCardSources(params: CardParams): Promise<CardSources> {
  const needs = cardDataNeeds(params.metrics);

  const [attribution, costComparison, baseFeeGwei] = await Promise.all([
    // Whole registry rather than the backend's default top-few breakout: an
    // entity folded into "other" would unfurl as the market-wide card, so a
    // link that renders correctly on the page would not on X.
    api
      .getAttributionUsageChart(params.range, params.network, 'auto', ATTRIBUTION_ENTITY_LIMIT)
      .catch((): BackendAttributionUsageChartResponse | null => null),
    needs.costComparison
      ? api
          .getCostComparisonChart(params.range, params.network)
          .catch((): BackendCostComparisonChartResponse | null => null)
      : Promise.resolve(null),
    needs.pricing
      ? api
          .getBlobPricing(params.network)
          .then((pricing) => pricing.currentBaseFeeGwei)
          .catch((): string | null => null)
      : Promise.resolve(null),
  ]);

  return { attribution, costComparison, baseFeeGwei };
}

/** Satori renders background images; next/image cannot run here. */
function ImageBox({ src, size: px, radius }: { src: string; size: number; radius?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        width: `${px}px`,
        height: `${px}px`,
        backgroundImage: `url(${src})`,
        backgroundSize: `${px}px ${px}px`,
        ...(radius === undefined ? {} : { borderRadius: `${radius}px` }),
      }}
    />
  );
}

function EntityMark({ entity, iconSrc }: { entity: CardEntity; iconSrc: string | null }) {
  if (entity.isNetworkWide) return null;

  if (!iconSrc) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '67px',
          height: '67px',
          borderRadius: '999px',
          backgroundColor: '#2a2f3a',
          fontFamily: 'Windsor Bold',
          fontSize: '31px',
          color: '#ffffff',
        }}
      >
        {entity.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return <ImageBox src={iconSrc} size={67} radius={999} />;
}

function StatRow({ stat }: { stat: CardStat }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid #23252a',
        padding: '14px 0',
      }}
    >
      <div style={{ display: 'flex', fontSize: '20px', letterSpacing: '3px', color: '#6e7687' }}>
        {stat.label.toUpperCase()}
      </div>
      <div
        style={{ display: 'flex', fontFamily: 'Windsor Bold', fontSize: '41px', color: '#ffffff' }}
      >
        {stat.value}
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (!hasCanonicalQuery(query, STAT_CARD_PARAMS)) return cardNotFound();

  // Resolved against the networks this deployment actually serves, so a card
  // for a dynamically advertised network reports that network rather than
  // silently rendering mainnet's numbers under its name.
  const network = await resolveCardNetwork(query.get('network'));
  const params = parseCardParams(query, network.apiParam);
  const networkName = network.name;

  const [windsorBold, gtFlexa, logo, sources] = await Promise.all([
    readFile(join(PUBLIC_DIR, 'fonts/WindsorBold/WindsorBold.woff')),
    readFile(join(PUBLIC_DIR, 'fonts/GT Flexa/GT-Flexa-Standard-Regular.woff')),
    readFile(join(PUBLIC_DIR, 'images/logo.png')),
    loadCardSources(params),
  ]);

  const { entity, stats } = resolveCard(params, sources);
  const iconSrc = await loadEntityIcon(entity.iconSrc);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '48px',
          backgroundColor: '#101216',
          backgroundImage:
            'radial-gradient(circle at 88% -15%, rgba(59,85,230,0.32), rgba(16,18,22,0) 58%)',
          fontFamily: 'GT Flexa',
          color: '#f1f2f4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ImageBox src={logoSrc} size={38} />
            <div
              style={{ display: 'flex', fontFamily: 'Windsor Bold', fontSize: '29px', color: '#f0f0f0' }}
            >
              {SITE_NAME}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #2c3140',
              backgroundColor: '#171a20',
              borderRadius: '999px',
              padding: '7px 17px',
              fontSize: '18px',
              color: '#8b93a3',
            }}
          >
            {networkName} · {CARD_RANGE_LABELS[params.range]}
          </div>
        </div>

        {/* Entity and stats travel together, so a two-metric card does not
            leave a hole in the middle. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '29px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '19px' }}>
            <EntityMark entity={entity} iconSrc={iconSrc} />
            <div
              style={{ display: 'flex', fontFamily: 'Windsor Bold', fontSize: '53px', color: '#ffffff' }}
            >
              {entity.name}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stats.map((stat) => (
              <StatRow key={stat.id} stat={stat} />
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '18px',
          }}
        >
          <div style={{ display: 'flex', color: '#9ac4fd' }}>{SITE_HOST}</div>
          <div style={{ display: 'flex', color: '#6e7687' }}>Ethereum blob analytics</div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
      fonts: [
        { name: 'Windsor Bold', data: windsorBold, style: 'normal' },
        { name: 'GT Flexa', data: gtFlexa, style: 'normal' },
      ],
    }
  );
}
