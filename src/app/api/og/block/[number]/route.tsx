import { ImageResponse } from 'next/og';
import { parseNetwork } from '@/constants';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getBlockOgData } from '@/lib/og/data';
import { buildBlockCard, buildFallbackCard } from '@/lib/og/format';

/**
 * Branded social share card for a block's blob details. Sibling of the chart
 * card route; the network comes from the query string because that is what a
 * network-scoped block URL shares.
 */
export const size = OG_SIZE;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ number: string }> }
) {
    const { number } = await params;
    const network = parseNetwork(new URL(request.url).searchParams.get('network'));

    // Every distinct URL is its own rasterization and cache key, so a
    // non-numeric block never reaches the backend or renders a card.
    if (!/^\d+$/.test(number)) {
        return new Response('Not found', {
            status: 404,
            headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
        });
    }

    const blockNumber = Number(number);
    const [fonts, logoSrc, block] = await Promise.all([
        loadOgFonts(),
        loadOgLogo(),
        getBlockOgData(blockNumber, network),
    ]);
    const content = block
        ? buildBlockCard(blockNumber, block, network)
        : buildFallbackCard(
              {
                  eyebrow: 'Block blob details',
                  title: `Block ${new Intl.NumberFormat().format(blockNumber)}`,
                  subtitle: 'Blob activity for this block',
              },
              network
          );

    return new ImageResponse(<OgCard content={content} logoSrc={logoSrc} />, {
        ...OG_SIZE,
        fonts,
        headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
    });
}
