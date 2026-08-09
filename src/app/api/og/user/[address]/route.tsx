import { ImageResponse } from 'next/og';
import { parseNetwork } from '@/constants';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getUserOgData, isBlobSenderAddress } from '@/lib/og/data';
import { buildFallbackCard, buildUserCard } from '@/lib/og/format';
import { truncateAddress } from '@/utils';

/**
 * Branded social share card for a sender's blob activity. Sibling of the
 * chart card route; the network comes from the query string because that is
 * what a network-scoped user URL shares.
 */
export const size = OG_SIZE;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address } = await params;
    const network = parseNetwork(new URL(request.url).searchParams.get('network'));

    // Every distinct URL is its own rasterization and cache key, so a
    // malformed address never reaches the backend or renders a card.
    if (!isBlobSenderAddress(address)) {
        return new Response('Not found', {
            status: 404,
            headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
        });
    }

    const [fonts, logoSrc, user] = await Promise.all([
        loadOgFonts(),
        loadOgLogo(),
        getUserOgData(address, network),
    ]);
    const content = user
        ? buildUserCard(address, user, network)
        : buildFallbackCard(
              {
                  eyebrow: 'Blob sender',
                  title: truncateAddress(address),
                  subtitle: 'Blob activity for this address',
              },
              network
          );

    return new ImageResponse(<OgCard content={content} logoSrc={logoSrc} />, {
        ...OG_SIZE,
        fonts,
        headers: { 'Cache-Control': OG_CARD_CACHE_CONTROL },
    });
}
