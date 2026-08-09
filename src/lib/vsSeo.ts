import type { Metadata } from 'next';
import type { BackendChartRange } from '@/types';
import { networkTitleSuffix } from '@/lib/pageMetadata';
import { networkPath } from '@/utils';
import {
  VS_RANGE_LABELS,
  buildVsHref,
  humanizeEntitySlug,
  normalizeEntitySlug,
} from './vs';

/**
 * Metadata shared by every vs route; the ranged routes pass their path
 * segment, the bare ones pass the default, and the copies under /[network]
 * pass the network they are scoped to. The og:image and twitter:image tags
 * come from each route's opengraph-image.tsx via the file convention.
 */
export function buildVsMetadata(
  a: string | undefined,
  b: string | undefined,
  range: BackendChartRange,
  network?: string,
): Metadata {
  const aName = humanizeEntitySlug(a);
  const bName = humanizeEntitySlug(b);
  const title = `${aName} vs ${bName}: Blob Battle${networkTitleSuffix(network)}`;
  const description =
    `Head-to-head Ethereum blobspace battle between ${aName} and ${bName}, ` +
    `${VS_RANGE_LABELS[range].toLowerCase()}: blobs posted, ETH spent, and ` +
    'cost per MB of blobspace.';

  return {
    title,
    description,
    alternates: {
      canonical: networkPath(
        buildVsHref(normalizeEntitySlug(a), normalizeEntitySlug(b), range),
        network,
      ),
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
