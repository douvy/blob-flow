import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { API_BASE_URL, DEFAULT_NETWORK } from '@/constants';
import {
  VS_ENTITY_LIMIT,
  VS_RANGE_LABELS,
  buildVsComparison,
  findShareBySlug,
  humanizeEntitySlug,
} from '@/lib/vs';
import type {
  ApiResponse,
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendChartRange,
  Network,
  VsComparisonRow,
  VsMetricFormat,
  VsWinner,
} from '@/types';
import {
  attributionNeedsLightBackdrop,
  formatCostEthOrWei,
  formatNumber,
  formatPercent,
  formatWeiToEth,
  getAttributionImageSrc,
  getAttributionInitial,
} from '@/utils';

/** Shared alt text for both vs opengraph-image routes. */
export const VS_OG_ALT = 'Rollup blobspace head-to-head comparison on BlobFlow';

/** Standard large-summary card dimensions. */
export const VS_OG_SIZE = { width: 1200, height: 630 };

/**
 * For an image URL whose network segment names no served network. The page
 * itself answers 404, and a card is cached and reshared, so labeling one with
 * another network's numbers is worse than declining to render it.
 */
export function vsOgNotFound(): Response {
  return new Response('Not found', { status: 404 });
}

/** How long fetched share data may be served from the cache, in seconds. */
const FETCH_REVALIDATE_SECONDS = 300;

const COLORS = {
  background: '#121316',
  card: '#14161a',
  divider: '#23252a',
  body: '#f1f2f4',
  secondary: '#6e7687',
  green: '#66cc99',
  blue: '#3b55e6',
};

async function fetchShares(
  range: BackendChartRange,
  network: string,
): Promise<BackendAttributionUsageShare[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/charts/attribution-usage?range=${range}&granularity=auto&network=${network}&limit=${VS_ENTITY_LIMIT}`,
      { next: { revalidate: FETCH_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as ApiResponse<BackendAttributionUsageChartResponse>;
    return body.data?.summary?.shares ?? [];
  } catch {
    return [];
  }
}

async function resolveMatchup(
  aSlug: string,
  bSlug: string,
  requested: BackendChartRange,
  network: string,
) {
  // A rollup can be quiet in a short window while still active over a month;
  // widen once before giving up on numbers entirely.
  const attempts: BackendChartRange[] = requested === '30d' ? ['30d'] : [requested, '30d'];

  let attempt: {
    range: BackendChartRange;
    shareA: BackendAttributionUsageShare | undefined;
    shareB: BackendAttributionUsageShare | undefined;
  } = { range: requested, shareA: undefined, shareB: undefined };

  for (const range of attempts) {
    const shares = await fetchShares(range, network);
    const shareA = findShareBySlug(shares, aSlug);
    const shareB = findShareBySlug(shares, bSlug);
    if (shareA && shareB) {
      return { range, shareA, shareB };
    }
    // Remember the first attempt that matched at least one side so the card
    // can still show canonical names.
    if (!attempt.shareA && !attempt.shareB) {
      attempt = { range, shareA, shareB };
    }
  }
  return attempt;
}

const ICON_MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/** Bundled entity icon as a data URI, or null when unknown or unreadable. */
async function loadIconDataUri(name: string): Promise<string | null> {
  const src = getAttributionImageSrc(name);
  if (!src) return null;
  const mime = ICON_MIME_TYPES[path.extname(src).toLowerCase()];
  if (!mime) return null;
  try {
    const file = await readFile(path.join(process.cwd(), 'public', src));
    return `data:${mime};base64,${file.toString('base64')}`;
  } catch {
    return null;
  }
}

async function loadFont(relativePath: string): Promise<ArrayBuffer | null> {
  try {
    const file = await readFile(path.join(process.cwd(), 'public', relativePath));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

function formatMetric(raw: string, format: VsMetricFormat): string {
  switch (format) {
    case 'count':
      return formatNumber(Number(raw));
    case 'percent':
      return formatPercent(Number(raw), 2);
    case 'eth':
      return formatWeiToEth(raw, true);
    case 'cost':
      return formatCostEthOrWei(raw);
  }
}

function formatOgValue(row: VsComparisonRow, side: 'a' | 'b'): string {
  return formatMetric(side === 'a' ? row.a : row.b, row.format);
}

/** The derived figure shown under a row's headline value, e.g. "24.62% share". */
function formatOgDetail(row: VsComparisonRow, side: 'a' | 'b'): string | null {
  if (!row.detail) return null;
  const raw = side === 'a' ? row.detail.a : row.detail.b;
  return `${formatMetric(raw, row.detail.format)} ${row.detail.label}`;
}

/** Icon size on the card, and the inset a backdropped glyph is drawn at. */
const OG_ICON_SIZE = 88;
const OG_BACKDROP_PADDING = 4;

/**
 * The card sits on the same dark background as the site, so it needs the same
 * two-part treatment as AttributionBadge: an outline on every logo, and a
 * light disc under the dark ones that leave their circle see-through. Scaled
 * up from the badge's hairline, since the card icon is several times larger.
 */
const OG_ICON_OUTLINE = 'inset 0 0 0 2px rgba(255,255,255,0.12)';

function Contender({
  name,
  iconDataUri,
  isWinner,
}: {
  name: string;
  iconDataUri: string | null;
  isWinner: boolean;
}) {
  const needsBackdrop = attributionNeedsLightBackdrop(name);
  const glyph = needsBackdrop ? OG_ICON_SIZE - OG_BACKDROP_PADDING * 2 : OG_ICON_SIZE;
  const inset = (OG_ICON_SIZE - glyph) / 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        width: 440,
      }}
    >
      <div style={{ display: 'flex', position: 'relative' }}>
        {iconDataUri ? (
          <div
            style={{
              display: 'flex',
              width: OG_ICON_SIZE,
              height: OG_ICON_SIZE,
              borderRadius: 9999,
              backgroundColor: needsBackdrop ? 'rgba(255,255,255,0.9)' : 'transparent',
              backgroundImage: `url("${iconDataUri}")`,
              backgroundSize: `${glyph}px ${glyph}px`,
              // Satori ignores the `center` keyword for URL backgrounds and
              // paints at the top left, so center the inset glyph by hand.
              backgroundPosition: `${inset}px ${inset}px`,
              backgroundRepeat: 'no-repeat',
              boxShadow: OG_ICON_OUTLINE,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: OG_ICON_SIZE,
              height: OG_ICON_SIZE,
              borderRadius: 9999,
              backgroundColor: '#6b7280',
              color: 'white',
              fontSize: 40,
            }}
          >
            {getAttributionInitial(name)}
          </div>
        )}
        {isWinner ? (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: -26,
              left: 0,
              width: OG_ICON_SIZE,
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            👑
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          color: 'white',
          fontFamily: 'Windsor Bold',
          fontSize: 38,
          textAlign: 'center',
        }}
      >
        {name}
      </div>
    </div>
  );
}

/**
 * Render the battle-card Open Graph image for a matchup. Shared by the bare
 * route (default range) and the /[range] route so both unfurl identically,
 * and by the /[network] copies of both, which pass the network they show.
 *
 * Both the network and the range come from the route, never from a client:
 * a crawler carries no selection of its own, so a shared link has to unfurl
 * with the same network and window its URL names.
 */
export async function renderVsOgImage(
  a: string | undefined,
  b: string | undefined,
  requestedRange: BackendChartRange,
  network: Network = DEFAULT_NETWORK,
): Promise<ImageResponse> {
  const [{ range, shareA, shareB }, windsorFont, flexaFont] = await Promise.all([
    resolveMatchup(a ?? '', b ?? '', requestedRange, network.apiParam),
    loadFont('fonts/WindsorBold/WindsorBold.woff'),
    loadFont('fonts/GT Flexa/GT-Flexa-Standard-Regular.woff'),
  ]);
  const aName = shareA?.name ?? humanizeEntitySlug(a);
  const bName = shareB?.name ?? humanizeEntitySlug(b);
  const comparison = shareA && shareB ? buildVsComparison(shareA, shareB) : null;
  const rows = comparison?.rows ?? [];

  const [iconA, iconB] = await Promise.all([
    loadIconDataUri(aName),
    loadIconDataUri(bName),
  ]);

  const winnerLine =
    comparison === null
      ? 'Live blobspace stats on BlobFlow'
      : comparison.overall === 'tie'
        ? 'Dead heat on the card'
        : `${comparison.overall === 'a' ? aName : bName} takes the matchup, ` +
          `${Math.max(comparison.rowWins.a, comparison.rowWins.b)} stats to ` +
          `${Math.min(comparison.rowWins.a, comparison.rowWins.b)}`;

  const fonts = [
    ...(flexaFont
      ? [{ name: 'GT Flexa', data: flexaFont, style: 'normal' as const, weight: 400 as const }]
      : []),
    ...(windsorFont
      ? [{ name: 'Windsor Bold', data: windsorFont, style: 'normal' as const, weight: 700 as const }]
      : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: COLORS.background,
          color: COLORS.body,
          fontFamily: flexaFont ? 'GT Flexa' : 'sans-serif',
          padding: '36px 48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: COLORS.secondary,
          }}
        >
          <span style={{ color: 'white', fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif', fontSize: 28 }}>
            BlobFlow
          </span>
          <span>
            Blob battle · {VS_RANGE_LABELS[range]}
            {network.apiParam === DEFAULT_NETWORK.apiParam ? '' : ` · ${network.name}`}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
          }}
        >
          <Contender name={aName} iconDataUri={iconA} isWinner={comparison?.overall === 'a'} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9999,
              border: `2px solid ${COLORS.divider}`,
              backgroundColor: COLORS.card,
              color: COLORS.secondary,
              fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif',
              fontSize: 30,
              width: 76,
              height: 76,
            }}
          >
            VS
          </div>
          <Contender name={bName} iconDataUri={iconB} isWinner={comparison?.overall === 'b'} />
        </div>

        {rows.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 20,
              borderTop: `1px solid ${COLORS.divider}`,
            }}
          >
            {rows.map((row) => {
              const cellColor = (side: VsWinner) =>
                row.winner === side ? COLORS.green : row.winner === 'tie' ? 'white' : COLORS.secondary;
              return (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: `1px solid ${COLORS.divider}`,
                    padding: '14px 0',
                    fontSize: 32,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      width: 440,
                      color: cellColor('a'),
                    }}
                  >
                    <span>{formatOgValue(row, 'a')}</span>
                    {row.detail ? (
                      <span style={{ color: COLORS.secondary, fontSize: 20 }}>
                        {formatOgDetail(row, 'a')}
                      </span>
                    ) : null}
                  </div>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      flexGrow: 1,
                      color: COLORS.secondary,
                      fontSize: 19,
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                    }}
                  >
                    {row.label}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: 440,
                      color: cellColor('b'),
                    }}
                  >
                    <span>{formatOgValue(row, 'b')}</span>
                    {row.detail ? (
                      <span style={{ color: COLORS.secondary, fontSize: 20 }}>
                        {formatOgDetail(row, 'b')}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 44,
              color: COLORS.secondary,
              fontSize: 28,
            }}
          >
            Compare blobs posted, ETH spent, and cost per MB of blobspace.
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 'auto',
            color: comparison && comparison.overall !== 'tie' ? COLORS.green : COLORS.secondary,
            fontSize: 24,
          }}
        >
          {winnerLine}
        </div>
      </div>
    ),
    {
      ...VS_OG_SIZE,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
