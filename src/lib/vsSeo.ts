import type { Metadata } from 'next';
import type { BackendChartRange } from '@/types';
import {
  VS_RANGE_LABELS,
  buildVsHref,
  humanizeEntitySlug,
  normalizeEntitySlug,
} from './vs';

/**
 * Metadata shared by both vs routes; the ranged route passes its path
 * segment, the bare route passes the default. The og:image and twitter:image
 * tags come from each route's opengraph-image.tsx via the file convention.
 */
export function buildVsMetadata(
  a: string | undefined,
  b: string | undefined,
  range: BackendChartRange,
): Metadata {
  const aName = humanizeEntitySlug(a);
  const bName = humanizeEntitySlug(b);
  const title = `${aName} vs ${bName}: Blob Battle`;
  const description =
    `Head-to-head Ethereum blobspace battle between ${aName} and ${bName}, ` +
    `${VS_RANGE_LABELS[range].toLowerCase()}: blobs posted, blobspace share, ` +
    'ETH spent, and cost per blob and per MB.';

  return {
    title,
    description,
    alternates: {
      canonical: buildVsHref(normalizeEntitySlug(a), normalizeEntitySlug(b), range),
    },
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
