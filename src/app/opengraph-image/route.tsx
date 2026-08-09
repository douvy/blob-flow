import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getHomeOgData } from '@/lib/og/data';
import { buildFallbackCard, buildHomeCard } from '@/lib/og/format';
import { ogScopeFromRequest } from '@/lib/og/params';

/**
 * Home Open Graph card. A route handler rather than an opengraph-image file
 * convention because the card reflects the network and time range the page is
 * showing, which shared URLs carry as params that file conventions never
 * receive.
 */
export async function GET(request: NextRequest) {
    const scope = ogScopeFromRequest(request);

    const [fonts, data] = await Promise.all([loadOgFonts(), getHomeOgData(scope)]);
    const content = buildHomeCard(data, scope) ?? buildFallbackCard({}, scope.network);

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
