import { ImageResponse } from 'next/og';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getBlockOgData } from '@/lib/og/data';
import { buildBlockCard, buildFallbackCard } from '@/lib/og/format';
import {
    cardNetwork,
    cardNotFound,
    hasCanonicalQuery,
    parseCanonicalBlockNumber,
} from '@/lib/og/request';

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
    const query = new URL(request.url).searchParams;

    const blockNumber = parseCanonicalBlockNumber(number);
    if (blockNumber === null || !hasCanonicalQuery(query)) return cardNotFound();

    const network = await cardNetwork(query);
    const [fonts, logoSrc, block] = await Promise.all([
        loadOgFonts(),
        loadOgLogo(),
        getBlockOgData(blockNumber, network),
    ]);

    // A block the indexer says does not exist has no card. An indexer that
    // could not answer is a different matter: the block may well exist, so
    // the URL still gets a branded card rather than a cached 404.
    if (block.status === 'missing') return cardNotFound();

    const content =
        block.status === 'ok'
            ? buildBlockCard(blockNumber, block.data, network)
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
