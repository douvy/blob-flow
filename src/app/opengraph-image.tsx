import { ImageResponse } from 'next/og';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getHomeOgData } from '@/lib/og/data';
import { buildFallbackCard, buildHomeCard } from '@/lib/og/format';

export const alt = 'BlobFlow: live Ethereum blob base fee and top rollup blob shares';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
    const [fonts, data] = await Promise.all([loadOgFonts(), getHomeOgData()]);
    const content = buildHomeCard(data) ?? buildFallbackCard();

    return new ImageResponse(<OgCard content={content} />, { ...size, fonts });
}
