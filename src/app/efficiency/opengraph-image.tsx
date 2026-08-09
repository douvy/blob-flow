import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { API_BASE_URL, EFFICIENCY_SAMPLE_SIZE } from '@/constants';
import { computeEfficiencyReport, type EntityReportCard } from '@/lib/efficiency';
import type { ApiResponse, BlobResponse } from '@/types';
import { formatPercent, getAttributionImageSrc, getAttributionInitial } from '@/utils';

export const alt = 'Rollup blobspace efficiency report card grades on BlobFlow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 300;

/** How long fetched blob rows may be served from the cache, in seconds. */
const FETCH_REVALIDATE_SECONDS = 300;

// The card always grades mainnet: crawlers cannot carry the viewer's network
// selection.
const OG_NETWORK = 'mainnet';

// Matches the page's feed paging, which the indexer caps per request.
const BLOB_FEED_PAGE_SIZE = 100;

const COLORS = {
  background: '#121316',
  card: '#14161a',
  divider: '#23252a',
  body: '#f1f2f4',
  secondary: '#6e7687',
  green: '#66cc99',
  red: '#ff6b6b',
};

/**
 * Recent blobs for grading. Unlike the client path this does not dedupe
 * across pages: a handful of rows repeated by feed drift shifts an average
 * imperceptibly, and a share card is not the place to spend the complexity.
 * Any failed page ends the sample rather than the render.
 */
async function fetchRecentBlobs(): Promise<BlobResponse[]> {
  const blobs: BlobResponse[] = [];
  const pages = Math.ceil(EFFICIENCY_SAMPLE_SIZE / BLOB_FEED_PAGE_SIZE);

  for (let page = 0; page < pages; page++) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/blob/latest?limit=${BLOB_FEED_PAGE_SIZE}&offset=${page * BLOB_FEED_PAGE_SIZE}&network=${OG_NETWORK}`,
        { next: { revalidate: FETCH_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) break;
      const body = (await response.json()) as ApiResponse<BlobResponse[]>;
      const rows = body.data ?? [];
      blobs.push(...rows);
      if (rows.length < BLOB_FEED_PAGE_SIZE) break;
    } catch {
      break;
    }
  }

  return blobs.slice(0, EFFICIENCY_SAMPLE_SIZE);
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

interface CardWithIcon {
  card: EntityReportCard;
  iconDataUri: string | null;
}

function GradeRow({
  entry,
  accent,
  windsorFont,
}: {
  entry: CardWithIcon;
  accent: string;
  windsorFont: ArrayBuffer | null;
}) {
  const { card, iconDataUri } = entry;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.divider}`,
        borderRadius: 12,
        padding: '14px 20px',
      }}
    >
      {iconDataUri ? (
        <div
          style={{
            display: 'flex',
            width: 52,
            height: 52,
            borderRadius: 9999,
            backgroundImage: `url("${iconDataUri}")`,
            backgroundSize: '52px 52px',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 9999,
            backgroundColor: '#6b7280',
            color: 'white',
            fontSize: 24,
          }}
        >
          {getAttributionInitial(card.entity)}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <span
          style={{
            color: 'white',
            fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif',
            fontSize: 30,
          }}
        >
          {card.entity}
        </span>
        <span style={{ color: COLORS.secondary, fontSize: 19 }}>
          {formatPercent(card.avgFillPercent)} full ·{' '}
          {card.avgHeadroomPercent === null
            ? 'no fee cap data'
            : `${formatPercent(card.avgHeadroomPercent)} fee cap headroom`}
        </span>
      </div>
      <span
        style={{
          display: 'flex',
          color: accent,
          fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif',
          fontSize: 52,
        }}
      >
        {card.grade.letter}
      </span>
    </div>
  );
}

function Column({
  heading,
  entries,
  accent,
  windsorFont,
}: {
  heading: string;
  entries: CardWithIcon[];
  accent: string;
  windsorFont: ArrayBuffer | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 530 }}>
      <span
        style={{
          color: accent,
          fontSize: 20,
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}
      >
        {heading}
      </span>
      {entries.map((entry) => (
        <GradeRow
          key={entry.card.entity}
          entry={entry}
          accent={accent}
          windsorFont={windsorFont}
        />
      ))}
    </div>
  );
}

/**
 * Share card for /efficiency: the best and worst graded rollups over the
 * same recent blob sample the page grades, so a shared link unfurls with the
 * dunk already visible.
 */
export default async function Image() {
  const [blobs, windsorFont, flexaFont] = await Promise.all([
    fetchRecentBlobs(),
    loadFont('fonts/WindsorBold/WindsorBold.woff'),
    loadFont('fonts/GT Flexa/GT-Flexa-Standard-Regular.woff'),
  ]);

  const report = computeEfficiencyReport(blobs);
  // Cards are sorted best first. With few enough entities to show every card
  // twice, split the list instead so no rollup appears in both columns.
  const perColumn = Math.min(3, Math.floor(report.cards.length / 2));
  const best = report.cards.slice(0, perColumn);
  const worst = report.cards.slice(report.cards.length - perColumn).reverse();

  const withIcons = async (cards: EntityReportCard[]): Promise<CardWithIcon[]> =>
    Promise.all(
      cards.map(async (card) => ({
        card,
        iconDataUri: await loadIconDataUri(card.entity),
      })),
    );
  const [bestEntries, worstEntries] = await Promise.all([
    withIcons(best),
    withIcons(worst),
  ]);

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
          <span
            style={{
              color: 'white',
              fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif',
              fontSize: 28,
            }}
          >
            BlobFlow
          </span>
          <span>Blobspace efficiency report cards</span>
        </div>

        {bestEntries.length > 0 ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 40,
                marginTop: 28,
              }}
            >
              <Column
                heading="Top of the class"
                entries={bestEntries}
                accent={COLORS.green}
                windsorFont={windsorFont}
              />
              <Column
                heading="Sent to detention"
                entries={worstEntries}
                accent={COLORS.red}
                windsorFont={windsorFont}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 'auto',
                color: COLORS.secondary,
                fontSize: 22,
              }}
            >
              Graded on blob fill, tip discipline, and fee cap overbidding over the last{' '}
              {report.sampleSize.toLocaleString()} blobs
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.secondary,
              fontSize: 30,
              textAlign: 'center',
            }}
          >
            Letter grades for how well each rollup fills its blobs and prices its bids.
          </div>
        )}
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
