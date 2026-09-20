import type { Metadata } from 'next';
import BuilderDetail from '@/components/BuilderDetail';
import { decodeBuilderKeyParam } from '@/lib/builders';
import { builderMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return builderMetadata(decodeBuilderKeyParam(key));
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  // Builder keys carry a ':' after their prefix, and the segment can arrive
  // still percent-encoded, so it is decoded before it reaches the client.
  const { key } = await params;
  return <BuilderDetail builderKey={decodeBuilderKeyParam(key)} />;
}
