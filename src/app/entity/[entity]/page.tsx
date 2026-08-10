import type { Metadata } from 'next';
import EntityDetail from '@/components/EntityDetail';
import { entityMetadata } from '@/lib/pageMetadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entity: string }>;
}): Promise<Metadata> {
  const { entity } = await params;
  return entityMetadata(entity);
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  return <EntityDetail slug={entity} />;
}
