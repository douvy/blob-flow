import { API_BASE_URL, DEFAULT_NETWORK, NETWORKS } from '@/constants';
import type { ApiResponse, BackendNetwork, Network } from '@/types';

/** How long a fetched network list is reused before being refetched. */
const NETWORK_LIST_TTL_SECONDS = 300;

const NETWORK_SLUG_PATTERN = /^[a-z0-9-]{1,32}$/;

/**
 * Network identifiers the indexer serves, or null when the list cannot be
 * fetched. Runs on the server so a network-scoped route can be rejected with
 * a real 404 instead of rendering a page against a network that isn't there.
 */
async function fetchNetworkSlugs(): Promise<string[] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/networks`, {
      next: { revalidate: NETWORK_LIST_TTL_SECONDS },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as ApiResponse<BackendNetwork[]>;
    const slugs = (payload.data ?? [])
      .map((network) => network.name?.toLowerCase())
      .filter((name): name is string => Boolean(name));

    return slugs.length > 0 ? slugs : null;
  } catch {
    return null;
  }
}

/**
 * Whether a URL's network segment names a network this deployment serves.
 *
 * Any single path segment matches the /[network] route, so this is what keeps
 * /anything from rendering as a network page. An unverifiable list (indexer
 * down) resolves to true: a real network must not 404 because the API blinked,
 * and the page's own error states cover the rest.
 */
export async function isServedNetwork(segment: string): Promise<boolean> {
  const slug = segment.toLowerCase();
  if (!NETWORK_SLUG_PATTERN.test(slug)) return false;

  // The hardcoded networks are part of the deployment, so they stand on their
  // own without the list.
  if (Object.values(NETWORKS).some((network) => network.apiParam === slug)) return true;

  const slugs = await fetchNetworkSlugs();
  return slugs === null || slugs.includes(slug);
}

/** Backend names are lowercase identifiers; present them title-cased. */
function toDisplayName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * The network a share card should report on, or null when the segment names
 * nothing this deployment serves.
 *
 * parseNetwork only knows the bootstrap constants, so on its own it answers
 * "mainnet" for any other network the indexer advertises: a card for such a
 * network would then show mainnet's numbers under that network's page. This
 * resolves against the served list instead, and still refuses to forward an
 * arbitrary string to the backend.
 *
 * Unlike isServedNetwork, an unverifiable list does not admit unknown slugs:
 * a card is cached and reshared, so mislabeling one is worse than declining
 * to render it while the list is unavailable.
 */
export async function resolveServedNetwork(segment: string): Promise<Network | null> {
  const slug = segment.toLowerCase();
  if (!NETWORK_SLUG_PATTERN.test(slug)) return null;

  const known = Object.values(NETWORKS).find((network) => network.apiParam === slug);
  if (known) return known;

  const slugs = await fetchNetworkSlugs();
  if (slugs === null || !slugs.includes(slug)) return null;

  return { name: toDisplayName(slug), apiParam: slug };
}

/** As resolveServedNetwork, falling back to the default network. */
export async function resolveCardNetwork(segment?: string | null): Promise<Network> {
  if (!segment) return DEFAULT_NETWORK;

  return (await resolveServedNetwork(segment)) ?? DEFAULT_NETWORK;
}
