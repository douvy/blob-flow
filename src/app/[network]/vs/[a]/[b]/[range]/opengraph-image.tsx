import { resolveServedNetwork } from '@/lib/serverNetworks';
import { parseVsRange } from '@/lib/vs';
import { VS_OG_ALT, VS_OG_SIZE, renderVsOgImage, vsOgNotFound } from '@/lib/vsOgImage';

export const alt = VS_OG_ALT;
export const size = VS_OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({
  params,
}: {
  params: Promise<{ network: string; a: string; b: string; range: string }>;
}) {
  const { network, a, b, range } = await params;
  // Layouts do not run for metadata images, so the segment is resolved here
  // rather than trusted from the route.
  const served = await resolveServedNetwork(network);
  if (!served) return vsOgNotFound();

  return renderVsOgImage(a, b, parseVsRange(range), served);
}
