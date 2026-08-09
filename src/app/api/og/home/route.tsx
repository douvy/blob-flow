import { ImageResponse } from 'next/og';
import { parseNetwork, parseTimeRange } from '@/constants';
import { OG_CARD_DEFAULT_RANGE } from '@/lib/ogChartSeries';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getHomeOgData } from '@/lib/og/data';
import { buildFallbackCard, buildHomeCard } from '@/lib/og/format';

/**
 * Branded social share card for the dashboard, and the site-wide default for
 * routes with no card of their own. Sibling of the chart card route, drawing
 * live stats instead of a plot.
 *
 * Query params:
 *   range    one of the header's time ranges
 *   network  one of the known networks; both fall back to the app defaults
 */
export const size = OG_SIZE;

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    const scope = {
        network: parseNetwork(query.get('network')),
        range: parseTimeRange(query.get('range'), OG_CARD_DEFAULT_RANGE),
    };

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
