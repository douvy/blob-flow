import type { Metadata } from 'next';
import BuilderDetail from '@/components/BuilderDetail';
import { builderMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return builderMetadata(key);
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  // Builder keys carry a ':' prefix naming where they came from, so the
  // segment arrives percent-encoded; Next decodes it before handing it over.
  const { key } = await params;
  return <BuilderDetail builderKey={key} />;
}
