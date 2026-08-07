import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getHomeOgData } from '@/lib/og/data';
import { buildFallbackCard, buildHomeCard } from '@/lib/og/format';
import { DEFAULT_TIME_RANGE, TIME_RANGE_PARAM, parseTimeRange } from '@/lib/timeRange';

/**
 * Home Open Graph card. A route handler rather than an opengraph-image file
 * convention because the card reflects the time range selected in the UI,
 * which shared URLs carry as a query param that file conventions never
 * receive.
 */
export async function GET(request: NextRequest) {
    const range =
        parseTimeRange(request.nextUrl.searchParams.get(TIME_RANGE_PARAM)) ?? DEFAULT_TIME_RANGE;

    const [fonts, data] = await Promise.all([loadOgFonts(), getHomeOgData(range)]);
    const content = buildHomeCard(data, range) ?? buildFallbackCard();

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
