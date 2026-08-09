import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/constants';

/**
 * Default social share card, inherited by every route that does not render
 * its own (the chart pages and the vs battle pages override it). Static: it
 * reads only bundled assets, so it is generated once at build time.
 */

export const alt = 'BlobFlow: real-time Ethereum EIP-4844 blob analytics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Mirrors the app theme (globals.css) and the vs card palette (vsOgImage).
const COLORS = {
  background: '#121316',
  body: '#f1f2f4',
  secondary: '#6e7687',
  green: '#66cc99',
};

async function loadPublicFile(relativePath: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), 'public', relativePath));
  } catch {
    return null;
  }
}

function toArrayBuffer(file: Buffer): ArrayBuffer {
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

export default async function Image() {
  const [logo, windsorFont, flexaFont] = await Promise.all([
    loadPublicFile('images/logo.png'),
    loadPublicFile('fonts/WindsorBold/WindsorBold.woff'),
    loadPublicFile('fonts/GT Flexa/GT-Flexa-Standard-Regular.woff'),
  ]);

  const logoDataUri = logo ? `data:image/png;base64,${logo.toString('base64')}` : null;

  const fonts = [
    ...(windsorFont
      ? [
          {
            name: 'Windsor Bold',
            data: toArrayBuffer(windsorFont),
            weight: 700 as const,
            style: 'normal' as const,
          },
        ]
      : []),
    ...(flexaFont
      ? [
          {
            name: 'GT Flexa',
            data: toArrayBuffer(flexaFont),
            weight: 400 as const,
            style: 'normal' as const,
          },
        ]
      : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 44,
          backgroundColor: COLORS.background,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {logoDataUri ? (
            <div
              style={{
                display: 'flex',
                width: 176,
                height: 175,
                backgroundImage: `url("${logoDataUri}")`,
                backgroundSize: '176px 175px',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span
              style={{
                color: COLORS.body,
                fontFamily: windsorFont ? 'Windsor Bold' : 'sans-serif',
                fontSize: 104,
                lineHeight: 1,
              }}
            >
              {SITE_NAME}
            </span>
            <span
              style={{
                color: COLORS.secondary,
                fontFamily: flexaFont ? 'GT Flexa' : 'sans-serif',
                fontSize: 36,
              }}
            >
              Real-time Ethereum blob analytics
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              width: 13,
              height: 13,
              borderRadius: 9999,
              backgroundColor: COLORS.green,
            }}
          />
          <span
            style={{
              color: COLORS.secondary,
              fontFamily: flexaFont ? 'GT Flexa' : 'sans-serif',
              fontSize: 26,
            }}
          >
            Live blob base fees · rollup usage · mempool pressure
          </span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  );
}
