import { ImageResponse } from 'next/og';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getHomeOgData } from '@/lib/og/data';
import { buildFallbackCard, buildHomeCard } from '@/lib/og/format';
import { cardNotFound, cardScope, hasCanonicalQuery } from '@/lib/og/request';

/**
 * Branded social share card for the dashboard, and the site-wide default for
 * routes with no card of their own. Sibling of the chart card route, drawing
 * live stats instead of a plot.
 *
 * Query params:
 *   range    one of the header's time ranges
 *   network  one the deployment serves; both fall back to the app defaults
 */
export const size = OG_SIZE;

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    if (!hasCanonicalQuery(query)) return cardNotFound();

    const scope = await cardScope(query);
    const [fonts, logoSrc, data] = await Promise.all([
        loadOgFonts(),
        loadOgLogo(),
        getHomeOgData(scope),
    ]);
    const content = buildHomeCard(data, scope) ?? buildFallbackCard({}, scope.network);

    return new ImageResponse(<OgCard content={content} logoSrc={logoSrc} />, {
        ...OG_SIZE,
        fonts,
        headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
    });
}
