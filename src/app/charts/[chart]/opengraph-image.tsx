import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { CHART_PAGES, SITE_URL } from '@/constants';

/**
 * Branded social share card for chart deep links (og:image, and X's
 * summary_large_image via the og fallback). Rendered at build/request time
 * with the real site fonts; satori accepts the woff (v1) files, the woff2
 * variants are not supported.
 */

export const alt = 'BlobFlow chart preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ chart: string }>;
}) {
  const { chart } = await params;
  const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
  const title = page?.title ?? 'Charts';
  const description = page?.description ?? 'Real-time Ethereum EIP-4844 blob analytics.';

  const [windsorBold, gtFlexa, logo] = await Promise.all([
    readFile(join(process.cwd(), 'public/fonts/WindsorBold/WindsorBold.woff')),
    readFile(join(process.cwd(), 'public/fonts/GT Flexa/GT-Flexa-Standard-Regular.woff')),
    readFile(join(process.cwd(), 'public/images/logo.png')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#121316',
          padding: '48px',
          fontFamily: 'GT Flexa',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: '#14161a',
            border: '2px solid #23252a',
            borderRadius: '24px',
            padding: '56px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img src={logoSrc} alt="" width={72} height={72} />
            <div style={{ fontFamily: 'Windsor Bold', fontSize: '48px', color: '#ffffff' }}>
              BlobFlow
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                fontFamily: 'Windsor Bold',
                fontSize: '76px',
                color: '#ffffff',
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '32px', color: '#f1f2f4', lineHeight: 1.4 }}>
              {description}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '26px',
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
      fonts: [
        { name: 'Windsor Bold', data: windsorBold, style: 'normal' },
        { name: 'GT Flexa', data: gtFlexa, style: 'normal' },
      ],
    }
  );
}
