import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { CHART_PAGES, SITE_NAME, SITE_URL, parseNetwork, parseTimeRange } from '@/constants';
import { fetchOgChartSeries, OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import { buildSparkDataUrl } from '@/lib/ogChartSpark';
import { OG_CARD_CACHE_CONTROL } from '@/lib/og/card';
import { cardNotFound, hasCanonicalQuery } from '@/lib/og/request';

/**
 * Branded social share card for chart deep links (og:image, and X's
 * summary_large_image). The chart is drawn server-side from the same backend
 * series the page plots: Recharts needs a DOM, which this route does not
 * have. When the backend is unreachable the card still renders, just without
 * the plot.
 *
 * This is a route handler rather than the opengraph-image file convention
 * because that convention only receives route params, and the card has to
 * honor the ?range= the sharer had selected.
 *
 * Query params:
 *   range    one of the header's time ranges
 *   network  one of the known networks; both fall back to the app defaults
 *
 * Unknown slugs 404 rather than rendering a generic card, and so does a query
 * naming anything beyond the two params above, or naming one of them twice:
 * every distinct URL is its own rasterization and its own CDN cache key, so
 * answering for arbitrary URLs turns this into unbounded work for anyone who
 * asks. A junk param is refused rather than ignored, since ignoring it still
 * mints a cache entry per spelling.
 *
 * Fonts are the site's woff (v1) files; satori does not accept woff2.
 */

export const size = { width: 1200, height: 630 };

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const SPARK_WIDTH = 1072;
const SPARK_HEIGHT = 190;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chart: string }> }
) {
  const { chart } = await params;
  const query = new URL(request.url).searchParams;
  if (!hasCanonicalQuery(query)) return cardNotFound();

  const range = parseTimeRange(query.get('range'), OG_CARD_DEFAULT_RANGE);
  const network = parseNetwork(query.get('network'));

  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  if (!page) return cardNotFound();
  const { title, description } = page;

  const [windsorBold, gtFlexa, logo, series] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/WindsorBold/WindsorBold.woff')),
    readFile(join(process.cwd(), 'public/fonts/GT Flexa/GT-Flexa-Standard-Regular.woff')),
    readFile(join(process.cwd(), 'public/images/logo.png')),
    fetchOgChartSeries(chart, range, network),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const sparkSrc = series
    ? buildSparkDataUrl(series.values, {
        width: SPARK_WIDTH,
        height: SPARK_HEIGHT,
        stroke: series.stroke,
        fill: series.fill,
      })
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#121316',
          padding: '40px',
          fontFamily: 'GT Flexa',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            backgroundColor: '#14161a',
            border: '2px solid #23252a',
            borderRadius: '24px',
            padding: '40px 48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {/* Satori renders background images; next/image cannot run here. */}
              <div
                style={{
                  display: 'flex',
                  width: '56px',
                  height: '56px',
                  backgroundImage: `url(${logoSrc})`,
                  backgroundSize: '56px 56px',
                }}
              />
              <div style={{ fontFamily: 'Windsor Bold', fontSize: '38px', color: '#ffffff' }}>
                {SITE_NAME}
              </div>
            </div>
            <div style={{ fontSize: '24px', color: '#6e7687' }}>
              {`${network.name} · last ${range}`}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '24px',
            }}
          >
            <div
              style={{
                fontFamily: 'Windsor Bold',
                fontSize: '54px',
                color: '#ffffff',
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '26px', color: '#f1f2f4' }}>
              {series ? series.caption : description}
            </div>
          </div>

          {sparkSrc ? (
            <div
              style={{
                display: 'flex',
                width: `${SPARK_WIDTH}px`,
                height: `${SPARK_HEIGHT}px`,
                backgroundImage: `url(${sparkSrc})`,
                backgroundSize: `${SPARK_WIDTH}px ${SPARK_HEIGHT}px`,
                marginTop: '20px',
                marginBottom: '20px',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexGrow: 1,
                alignItems: 'center',
                fontSize: '26px',
                color: '#6e7687',
                marginTop: '24px',
              }}
            >
              {description}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'auto',
              fontSize: '24px',
              color: '#6e7687',
            }}
          >
            <div>Real-time Ethereum blob analytics</div>
            <div>{SITE_HOST}</div>
          </div>
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
