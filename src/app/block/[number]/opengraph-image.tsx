import { ImageResponse } from 'next/og';
import { OgCard, OG_SIZE, loadOgFonts } from '@/lib/og/card';
import { getBlockOgData } from '@/lib/og/data';
import { buildBlockCard, buildFallbackCard } from '@/lib/og/format';

export const alt = 'BlobFlow: blob details for an Ethereum block';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ number: string }> }) {
    const { number } = await params;
    const blockNumber = /^\d+$/.test(number) ? Number(number) : NaN;

    const [fonts, block] = await Promise.all([loadOgFonts(), getBlockOgData(blockNumber)]);
    const content = block
        ? buildBlockCard(blockNumber, block)
        : buildFallbackCard(
              Number.isSafeInteger(blockNumber)
                  ? {
                        eyebrow: 'Block blob details',
                        title: `Block ${new Intl.NumberFormat().format(blockNumber)}`,
                        subtitle: 'Blob activity for this block on BlobFlow',
                    }
                  : undefined
          );

    return new ImageResponse(<OgCard content={content} />, { ...size, fonts });
}
