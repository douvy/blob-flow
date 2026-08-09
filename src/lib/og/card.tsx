import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_NAME } from '@/constants';
import type { OgCardContent, OgAccent } from './format';

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Crawlers refetch cards often, so serve them from cache for five minutes
 * instead of turning every unfurl into a backend request. Matches the chart
 * card route.
 */
export const OG_CARD_CACHE_CONTROL =
    'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

/** Mirrors the @theme palette in src/app/globals.css. */
export const OG_COLORS = {
    background: '#121316',
    container: '#141519',
    titleText: '#f0f0f0',
    bodyText: '#f1f2f4',
    secondaryText: '#6e7687',
    divider: '#23252a',
    blue: '#3b55e6',
    lightBlue: '#9ac4fd',
    green: '#66cc99',
    red: '#ff6b6b',
} as const;

const ACCENT_COLORS: Record<OgAccent, string> = {
    blue: OG_COLORS.blue,
    lightBlue: OG_COLORS.lightBlue,
    green: OG_COLORS.green,
    red: OG_COLORS.red,
};

export interface OgFont {
    name: string;
    data: Buffer;
    weight: 400 | 700;
    style: 'normal';
}

/**
 * The site logo as a data URI. Satori renders background images and cannot
 * run next/image, and it has no origin to resolve a public path against.
 * Null when the file cannot be read, which only costs the card its mark.
 */
export async function loadOgLogo(): Promise<string | null> {
    try {
        const logo = await readFile(join(process.cwd(), 'public', 'images', 'logo.png'));
        return `data:image/png;base64,${logo.toString('base64')}`;
    } catch {
        return null;
    }
}

/**
 * Load the site fonts for ImageResponse. Satori reads TTF/OTF/WOFF (not
 * WOFF2), so this loads the .woff variants. Returns undefined when the files
 * cannot be read; ImageResponse then falls back to its bundled default font.
 */
export async function loadOgFonts(): Promise<OgFont[] | undefined> {
    try {
        const fontsDir = join(process.cwd(), 'public', 'fonts');
        const [gtFlexa, windsorBold] = await Promise.all([
            readFile(join(fontsDir, 'GT Flexa', 'GT-Flexa-Standard-Regular.woff')),
            readFile(join(fontsDir, 'WindsorBold', 'WindsorBold.woff')),
        ]);

        return [
            { name: 'GT Flexa', data: gtFlexa, weight: 400, style: 'normal' },
            { name: 'Windsor Bold', data: windsorBold, weight: 700, style: 'normal' },
        ];
    } catch {
        return undefined;
    }
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: OgAccent }) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '24px 32px',
                borderRadius: 16,
                backgroundColor: OG_COLORS.container,
                border: `1px solid ${OG_COLORS.divider}`,
            }}
        >
            <span
                style={{
                    fontSize: 22,
                    color: OG_COLORS.secondaryText,
                    letterSpacing: 1,
                }}
            >
                {label.toUpperCase()}
            </span>
            <span
                style={{
                    fontSize: 40,
                    color: accent ? ACCENT_COLORS[accent] : OG_COLORS.bodyText,
                    fontFamily: '"Windsor Bold"',
                    fontWeight: 700,
                }}
            >
                {value}
            </span>
        </div>
    );
}

/**
 * The shared 1200x630 Open Graph card: dark grid background, BlobFlow brand
 * row, a big headline, and up to three stat chips.
 */
export function OgCard({ content, logoSrc }: { content: OgCardContent; logoSrc?: string | null }) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 64,
                backgroundColor: OG_COLORS.background,
                backgroundImage:
                    'linear-gradient(rgba(50, 60, 80, 0.15) 1px, transparent 1px), ' +
                    'linear-gradient(90deg, rgba(50, 60, 80, 0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                fontFamily: '"GT Flexa"',
                color: OG_COLORS.bodyText,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Satori renders background images; next/image cannot run here. */}
                    <div
                        style={{
                            display: 'flex',
                            width: 56,
                            height: 56,
                            borderRadius: logoSrc ? 0 : 9999,
                            ...(logoSrc
                                ? { backgroundImage: `url(${logoSrc})`, backgroundSize: '56px 56px' }
                                : {
                                      background: `linear-gradient(135deg, ${OG_COLORS.blue}, ${OG_COLORS.lightBlue})`,
                                  }),
                        }}
                    />
                    <span
                        style={{
                            fontSize: 44,
                            color: OG_COLORS.titleText,
                            fontFamily: '"Windsor Bold"',
                            fontWeight: 700,
                        }}
                    >
                        {SITE_NAME}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: 9999,
                            backgroundColor: OG_COLORS.green,
                        }}
                    />
                    <span style={{ fontSize: 26, color: OG_COLORS.secondaryText }}>
                        {content.networkLabel}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <span
                    style={{
                        fontSize: 26,
                        color: OG_COLORS.secondaryText,
                        letterSpacing: 3,
                    }}
                >
                    {content.eyebrow.toUpperCase()}
                </span>
                <span
                    style={{
                        fontSize: 92,
                        lineHeight: 1.05,
                        color: OG_COLORS.titleText,
                        fontFamily: '"Windsor Bold"',
                        fontWeight: 700,
                    }}
                >
                    {content.title}
                </span>
                {content.subtitle ? (
                    <span style={{ fontSize: 32, color: OG_COLORS.secondaryText }}>
                        {content.subtitle}
                    </span>
                ) : null}
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {content.stats.slice(0, 3).map((stat) => (
                    <StatChip
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        accent={stat.accent}
                    />
                ))}
            </div>
        </div>
    );
}
