"use client";

import { useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { DEFAULT_NETWORK, NETWORKS } from '../constants';
import type { BackendNetwork, Network } from '../types';
import { api } from '@/lib/api';
import { networkPath, stripNetworkPath } from '@/utils';
import { useApiData } from './useApiData';

// Bootstrap list shown before GET /networks resolves and if it fails.
const FALLBACK_NETWORKS = Object.values(NETWORKS);

/** Shape of a network identifier, matching the route segment it comes from. */
const NETWORK_SLUG_PATTERN = /^[a-z0-9-]{1,32}$/;

/** Backend names are lowercase identifiers; present them title-cased. */
function toDisplayName(apiParam: string): string {
  return apiParam.charAt(0).toUpperCase() + apiParam.slice(1);
}

/** Build a network option from just its identifier (no backend metadata). */
function networkFromApiParam(apiParam: string): Network {
  return {
    name: toDisplayName(apiParam),
    apiParam,
  };
}

/**
 * Build a network option from a GET /networks entry, honoring optional
 * presentation fields when the backend provides them and falling back
 * gracefully while it does not.
 */
function networkFromBackend(network: BackendNetwork): Network {
  return {
    name: network.display_name?.trim() || toDisplayName(network.name),
    apiParam: network.name,
    icon: network.icon?.trim() || undefined,
  };
}

/**
 * Custom hook for the network a page is showing.
 *
 * The network lives in the URL: the default network keeps the bare paths and
 * every other network is scoped under its own segment (`/sepolia/blocks`), so
 * any page can be linked, bookmarked, or shared without the recipient's own
 * preferences changing what they see.
 *
 * The option list is fetched from GET /networks (shared ['networks'] cache, so
 * every caller dedupes onto one request) and falls back to the hardcoded
 * NETWORKS constant while loading or on error.
 *
 * @returns The network in the URL, a setter that navigates to another
 * network's copy of the current page, the option list, and whether the URL's
 * network is one the deployment actually serves.
 */
export function useNetwork() {
    const params = useParams();
    const pathname = usePathname();

    // Next has already decoded the segment. Anything that is not a network
    // slug is not treated as a network at all, so a hand-typed segment can
    // neither reach the API as a query value nor crash a decode.
    const rawPathNetwork = params?.network;
    const pathSegment = typeof rawPathNetwork === 'string' ? rawPathNetwork.toLowerCase() : null;
    const pathNetwork = pathSegment && NETWORK_SLUG_PATTERN.test(pathSegment) ? pathSegment : null;

    const fetchNetworks = useCallback(async () => {
        const response = await api.getNetworks();
        if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch networks');
        }
        // Drop malformed entries: an empty name would produce an empty apiParam,
        // which fetchApi treats as "no network" and silently queries the default.
        return response.data
            .filter((network) => network.name)
            .map(networkFromBackend);
    }, []);

    // Networks change rarely, so keep them fresh for a while to avoid refetching
    // on every mount across the many components that call this hook.
    const { data } = useApiData<Network[]>(fetchNetworks, ['networks'], {
        staleTime: 5 * 60 * 1000,
    });

    // A real, successful list. Absent while loading and on error (retries are off
    // app-wide, so an error sticks until the next refetch), where we fall back.
    const fetchedNetworks = data && data.length > 0 ? data : undefined;
    const networkOptions = fetchedNetworks ?? FALLBACK_NETWORKS;

    const defaultNetwork =
        networkOptions.find((network) => network.apiParam === DEFAULT_NETWORK.apiParam) ??
        DEFAULT_NETWORK;

    // A network in the URL is trusted even before the list resolves, so a
    // dynamic-only network doesn't flash to the default and open the wrong
    // live-data connection while /networks is in flight.
    const selectedNetwork = pathNetwork
        ? (networkOptions.find((network) => network.apiParam === pathNetwork) ??
          networkFromApiParam(pathNetwork))
        : defaultNetwork;

    // Switching network means the same page on that network. A full navigation
    // (rather than a soft one) rebuilds every cache and live subscription for
    // the new network, as the previous reload-based switch did. The segment to
    // replace comes from the route itself, not from the option list, so a
    // network missing from a stalled list is still swapped rather than stacked.
    const setSelectedNetwork = (network: Network) => {
        const currentPath = pathname || '/';
        const basePath = pathNetwork ? stripNetworkPath(currentPath, [pathNetwork]) : currentPath;
        const { search, hash } = window.location;
        window.location.assign(`${networkPath(basePath, network.apiParam)}${search}${hash}`);
    };

    return {
        selectedNetwork,
        setSelectedNetwork,
        networkOptions,
    };
}
