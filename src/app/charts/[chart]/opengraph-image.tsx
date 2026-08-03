import { ImageResponse } from 'next/og';
import { CHART_PAGES } from '@/constants';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import {
    getAttributionOgChart,
    getBlobMarketOgChart,
    getCostComparisonOgChart,
    getRollingStatsOgChart,
} from '@/lib/og/data';
import { buildChartCard, buildFallbackCard } from '@/lib/og/format';

export const alt = 'BlobFlow chart: live Ethereum blob market stats';
export const size = OG_SIZE;
export const contentType = 'image/png';

const CHART_DATA_LOADERS = {
    'base-fee': getBlobMarketOgChart,
    'gas-utilization': getBlobMarketOgChart,
    'blob-usage': getAttributionOgChart,
    'cost-comparison': getCostComparisonOgChart,
    'rolling-market-stats': getRollingStatsOgChart,
} as const;

function isKnownChart(slug: string): slug is keyof typeof CHART_DATA_LOADERS {
    return slug in CHART_DATA_LOADERS;
}

export default async function Image({ params }: { params: Promise<{ chart: string }> }) {
    const { chart } = await params;
    const page = CHART_PAGES.find((chartPage) => chartPage.slug === chart);
    const fallback = buildFallbackCard(
        page ? { eyebrow: 'Blob market charts', title: page.title } : undefined
    );

    const [fonts, data] = await Promise.all([
        loadOgFonts(),
        isKnownChart(chart) ? CHART_DATA_LOADERS[chart]() : Promise.resolve(null),
    ]);
    const content = buildChartCard(chart, data) ?? fallback;

    return new ImageResponse(<OgCard content={content} />, { ...size, fonts });
}
