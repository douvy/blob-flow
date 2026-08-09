import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getBlockOgData } from '@/lib/og/data';
import { buildBlockCard, buildFallbackCard } from '@/lib/og/format';
import { ogNetworkParam } from '@/lib/og/params';

/**
 * Block Open Graph card. A route handler rather than an opengraph-image file
 * convention so the network can be passed in: file conventions receive no
 * query params, which would leave every network-scoped block page showing
 * mainnet data.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ number: string }> }
) {
    const { number } = await params;
    const network = ogNetworkParam(request);
    const blockNumber = /^\d+$/.test(number) ? Number(number) : NaN;

    const [fonts, block] = await Promise.all([
        loadOgFonts(),
        getBlockOgData(blockNumber, network),
    ]);
    const content = block
        ? buildBlockCard(blockNumber, block, network)
        : buildFallbackCard(
              Number.isSafeInteger(blockNumber)
                  ? {
                        eyebrow: 'Block blob details',
                        title: `Block ${new Intl.NumberFormat().format(blockNumber)}`,
                        subtitle: 'Blob activity for this block on BlobFlow',
                    }
                  : {},
              network
          );

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
