import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { CHART_PAGES } from '@/constants';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import {
    getAttributionOgChart,
    getBlobMarketOgChart,
    getCostComparisonOgChart,
    getRollingStatsOgChart,
} from '@/lib/og/data';
import { buildChartCard, buildFallbackCard } from '@/lib/og/format';
import {
    DEFAULT_TIME_RANGE,
    TIME_RANGE_PARAM,
    parseTimeRange,
    type TimeRange,
} from '@/lib/timeRange';

type ChartOgLoader = (range: TimeRange) => Promise<Parameters<typeof buildChartCard>[1]>;

const CHART_DATA_LOADERS: Record<
    'base-fee' | 'gas-utilization' | 'blob-usage' | 'cost-comparison' | 'rolling-market-stats',
    ChartOgLoader
> = {
    'base-fee': getBlobMarketOgChart,
    'gas-utilization': getBlobMarketOgChart,
    'blob-usage': getAttributionOgChart,
    'cost-comparison': getCostComparisonOgChart,
    // Rolling stats always show the same fixed windows, so the range is unused.
    'rolling-market-stats': () => getRollingStatsOgChart(),
};

function isKnownChart(slug: string): slug is keyof typeof CHART_DATA_LOADERS {
    return slug in CHART_DATA_LOADERS;
}

/**
 * Chart Open Graph cards. A route handler rather than an opengraph-image
 * file convention because the card reflects the time range selected in the
 * UI, which shared URLs carry as a query param that file conventions never
 * receive.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chart: string }> }
) {
    const { chart } = await params;
    const range =
        parseTimeRange(request.nextUrl.searchParams.get(TIME_RANGE_PARAM)) ?? DEFAULT_TIME_RANGE;

    const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
    const fallback = buildFallbackCard(
        page ? { eyebrow: 'Blob market charts', title: page.title } : undefined
    );

    const [fonts, data] = await Promise.all([
        loadOgFonts(),
        isKnownChart(chart) ? CHART_DATA_LOADERS[chart](range) : Promise.resolve(null),
    ]);
    const content = buildChartCard(chart, data, range) ?? fallback;

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
