import { ImageResponse } from 'next/og';
import { OgCard, OG_CARD_CACHE_CONTROL, OG_SIZE, loadOgFonts, loadOgLogo } from '@/lib/og/card';
import { getUserOgData, isBlobSenderAddress } from '@/lib/og/data';
import { buildFallbackCard, buildUserCard } from '@/lib/og/format';
import { cardNetwork, cardNotFound, hasCanonicalQuery } from '@/lib/og/request';
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
    const query = new URL(request.url).searchParams;

    // One address, one card URL: the checksummed and lowercase spellings of
    // an address would otherwise be two rasterizations of the same card.
    const canonicalAddress = address.toLowerCase();
    if (
        !isBlobSenderAddress(address) ||
        address !== canonicalAddress ||
        !hasCanonicalQuery(query)
    ) {
        return cardNotFound();
    }

    const network = await cardNetwork(query);
    const [fonts, logoSrc, user] = await Promise.all([
        loadOgFonts(),
        loadOgLogo(),
        getUserOgData(canonicalAddress, network),
    ]);

    // An address the indexer has never seen send a blob has no card. An
    // indexer that could not answer still gets a branded one.
    if (user.status === 'missing') return cardNotFound();

    const content =
        user.status === 'ok'
            ? buildUserCard(canonicalAddress, user.data, network)
            : buildFallbackCard(
                  {
                      eyebrow: 'Blob sender',
                      title: truncateAddress(canonicalAddress),
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
