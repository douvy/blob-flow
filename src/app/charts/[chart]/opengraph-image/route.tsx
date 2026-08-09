import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CHART_PAGES } from '@/constants';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import {
    getAttributionOgChart,
    getBlobMarketOgChart,
    getCostComparisonOgChart,
    getRollingStatsOgChart,
    type OgScope,
} from '@/lib/og/data';
import { buildChartCard, buildFallbackCard } from '@/lib/og/format';
import { ogScopeFromRequest } from '@/lib/og/params';

type ChartOgLoader = (scope: OgScope) => Promise<Parameters<typeof buildChartCard>[1]>;

const CHART_DATA_LOADERS: Record<string, ChartOgLoader> = {
    'base-fee': getBlobMarketOgChart,
    'gas-utilization': getBlobMarketOgChart,
    'blob-usage': getAttributionOgChart,
    'blob-share': getAttributionOgChart,
    'cost-comparison': getCostComparisonOgChart,
    'rolling-market-stats': getRollingStatsOgChart,
};

/**
 * Chart Open Graph cards. A route handler rather than an opengraph-image file
 * convention because the card reflects the network and time range the page is
 * showing, which shared URLs carry as params that file conventions never
 * receive.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chart: string }> }
) {
    const { chart } = await params;
    const scope = ogScopeFromRequest(request);

    const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
    const loadChartData = CHART_DATA_LOADERS[chart];

    const [fonts, data] = await Promise.all([
        loadOgFonts(),
        loadChartData ? loadChartData(scope) : Promise.resolve(null),
    ]);
    const content =
        buildChartCard(chart, data, scope) ??
        buildFallbackCard(
            page ? { eyebrow: 'Blob market charts', title: page.title } : {},
            scope.network
        );

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
