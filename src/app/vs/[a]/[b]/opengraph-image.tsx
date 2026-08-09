import { DEFAULT_VS_RANGE } from '@/lib/vs';
import { VS_OG_ALT, VS_OG_SIZE, renderVsOgImage } from '@/lib/vsOgImage';

export const alt = VS_OG_ALT;
export const size = VS_OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  return renderVsOgImage(a, b, DEFAULT_VS_RANGE);
}
