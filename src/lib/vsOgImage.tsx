import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { API_BASE_URL } from '@/constants';
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
  VsComparisonRow,
  VsWinner,
} from '@/types';
import {
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

/** How long fetched share data may be served from the cache, in seconds. */
const FETCH_REVALIDATE_SECONDS = 300;

// The card always shows mainnet: crawlers cannot carry the viewer's network
// selection. The range comes from the route, so shared links unfurl with the
// same window the page shows.
const OG_NETWORK = 'mainnet';

const COLORS = {
  background: '#121316',
  card: '#14161a',
  divider: '#23252a',
  body: '#f1f2f4',
  secondary: '#6e7687',
  green: '#66cc99',
  blue: '#3b55e6',
};

async function fetchShares(range: BackendChartRange): Promise<BackendAttributionUsageShare[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/charts/attribution-usage?range=${range}&granularity=auto&network=${OG_NETWORK}&limit=${VS_ENTITY_LIMIT}`,
      { next: { revalidate: FETCH_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as ApiResponse<BackendAttributionUsageChartResponse>;
    return body.data?.summary?.shares ?? [];
  } catch {
    return [];
  }
}

async function resolveMatchup(aSlug: string, bSlug: string, requested: BackendChartRange) {
  // A rollup can be quiet in a short window while still active over a month;
  // widen once before giving up on numbers entirely.
  const attempts: BackendChartRange[] = requested === '30d' ? ['30d'] : [requested, '30d'];

  let attempt: {
    range: BackendChartRange;
    shareA: BackendAttributionUsageShare | undefined;
    shareB: BackendAttributionUsageShare | undefined;
  } = { range: requested, shareA: undefined, shareB: undefined };

  for (const range of attempts) {
    const shares = await fetchShares(range);
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

function formatOgValue(row: VsComparisonRow, side: 'a' | 'b'): string {
  const raw = side === 'a' ? row.a : row.b;
  switch (row.format) {
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

function Contender({
  name,
  iconDataUri,
  isWinner,
}: {
  name: string;
  iconDataUri: string | null;
  isWinner: boolean;
}) {
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
      {iconDataUri ? (
        <div
          style={{
            display: 'flex',
            width: 88,
            height: 88,
            borderRadius: 9999,
            backgroundImage: `url("${iconDataUri}")`,
            backgroundSize: '88px 88px',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 88,
            height: 88,
            borderRadius: 9999,
            backgroundColor: '#6b7280',
            color: 'white',
            fontSize: 40,
          }}
        >
          {getAttributionInitial(name)}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'white',
          fontFamily: 'Windsor Bold',
          fontSize: 38,
          textAlign: 'center',
        }}
      >
        {isWinner ? <span style={{ fontSize: 28 }}>👑</span> : null}
        <span>{name}</span>
      </div>
    </div>
  );
}

/**
 * Render the battle-card Open Graph image for a matchup. Shared by the bare
 * route (default range) and the /[range] route so both unfurl identically.
 */
export async function renderVsOgImage(
  a: string | undefined,
  b: string | undefined,
  requestedRange: BackendChartRange,
): Promise<ImageResponse> {
  const [{ range, shareA, shareB }, windsorFont, flexaFont] = await Promise.all([
    resolveMatchup(a ?? '', b ?? '', requestedRange),
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
          <span>Blob battle · {VS_RANGE_LABELS[range]}</span>
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
                    padding: '8px 0',
                    fontSize: 25,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      width: 440,
                      color: cellColor('a'),
                    }}
                  >
                    {formatOgValue(row, 'a')}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      flexGrow: 1,
                      color: COLORS.secondary,
                      fontSize: 17,
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      width: 440,
                      color: cellColor('b'),
                    }}
                  >
                    {formatOgValue(row, 'b')}
                  </span>
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
            Compare blobs posted, blobspace share, ETH spent, and cost per MB.
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
