import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getUserOgData } from '@/lib/og/data';
import { buildFallbackCard, buildUserCard } from '@/lib/og/format';
import { ogNetworkParam } from '@/lib/og/params';
import { truncateAddress } from '@/utils';

/**
 * User Open Graph card. A route handler rather than an opengraph-image file
 * convention so the network can be passed in: file conventions receive no
 * query params, which would leave every network-scoped user page showing
 * mainnet data.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address } = await params;
    const network = ogNetworkParam(request);

    const [fonts, user] = await Promise.all([loadOgFonts(), getUserOgData(address, network)]);
    const content = user
        ? buildUserCard(address, user, network)
        : buildFallbackCard(
              {
                  eyebrow: 'Blob sender',
                  title: truncateAddress(address) || 'Blob activity',
                  subtitle: 'Blob activity for this address on BlobFlow',
              },
              network
          );

    return new ImageResponse(<OgCard content={content} />, { ...OG_SIZE, fonts });
}
