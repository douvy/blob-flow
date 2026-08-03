import { ImageResponse } from 'next/og';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getUserOgData } from '@/lib/og/data';
import { buildFallbackCard, buildUserCard } from '@/lib/og/format';
import { truncateAddress } from '@/utils';

export const alt = 'BlobFlow: blob activity for an Ethereum address';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
    const { address } = await params;

    const [fonts, user] = await Promise.all([loadOgFonts(), getUserOgData(address)]);
    const content = user
        ? buildUserCard(address, user)
        : buildFallbackCard({
              eyebrow: 'Blob sender',
              title: truncateAddress(address) || 'Blob activity',
              subtitle: 'Blob activity for this address on BlobFlow',
          });

    return new ImageResponse(<OgCard content={content} />, { ...size, fonts });
}
