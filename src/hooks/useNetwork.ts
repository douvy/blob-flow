"use client";

import { useCallback, useEffect } from 'react';
import { DEFAULT_NETWORK, NETWORKS } from '../constants';
import type { BackendNetwork, Network } from '../types';
import { api } from '@/lib/api';
import { useApiData } from './useApiData';
import { useLocalStorage } from './useLocalStorage';

// Bootstrap list shown before GET /networks resolves and if it fails.
const FALLBACK_NETWORKS = Object.values(NETWORKS);

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
 * Custom hook for managing network selection.
 *
 * The option list is fetched from GET /networks (shared ['networks'] cache, so
 * every caller dedupes onto one request) and falls back to the hardcoded
 * NETWORKS constant while loading or on error.
 *
 * @returns Object with selected network, setter, and network options
 */
export function useNetwork() {
    // Persist by apiParam, the stable identifier. Older builds stored the
    // display name ("Mainnet"); lower-casing recovers the apiParam from those,
    // so previously saved selections keep working.
    const [storedValue, setStoredValue] = useLocalStorage(
        'selectedNetwork',
        DEFAULT_NETWORK.apiParam
    );
    const storedApiParam = storedValue.toLowerCase();

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
    const { data, isLoading } = useApiData<Network[]>(fetchNetworks, ['networks'], {
        staleTime: 5 * 60 * 1000,
    });

    // A real, successful list. Absent while loading and on error (retries are off
    // app-wide, so an error sticks until the next refetch), where we fall back.
    const fetchedNetworks = data && data.length > 0 ? data : undefined;
    const networkOptions = fetchedNetworks ?? FALLBACK_NETWORKS;

    // Derive selected network from stored apiParam; stays in sync without a
    // separate effect.
    const selectedNetwork =
        networkOptions.find((network) => network.apiParam === storedApiParam) ??
        // Still loading: trust the persisted choice so a dynamic-only network
        // (absent from the fallback list) doesn't flash to the default and open
        // the wrong live-data connection before /networks resolves. On error we
        // deliberately do NOT trust it, so an unknown value resolves to a network
        // the selector can actually show rather than querying a maybe-dead one.
        (isLoading && storedApiParam ? networkFromApiParam(storedApiParam) : undefined) ??
        // Settled without the persisted network: prefer the default.
        networkOptions.find((network) => network.apiParam === DEFAULT_NETWORK.apiParam) ??
        networkOptions[0] ??
        DEFAULT_NETWORK;

    // Only after a successful fetch, if the persisted network is genuinely gone,
    // rewrite storage so the loading-phase optimistic path doesn't re-query a dead
    // network on every reload. Gated on a real list (not error) so a transient
    // failure never erases a still-valid preference; it returns when /networks does.
    useEffect(() => {
        if (!fetchedNetworks) return;
        const stillExists = fetchedNetworks.some(
            (network) => network.apiParam === storedApiParam
        );
        if (!stillExists && storedApiParam !== selectedNetwork.apiParam) {
            setStoredValue(selectedNetwork.apiParam);
        }
    }, [fetchedNetworks, storedApiParam, selectedNetwork.apiParam, setStoredValue]);

    // Update the selected network and store it in local storage
    const setSelectedNetwork = (network: Network) => {
        setStoredValue(network.apiParam);

        // Force a page reload to refresh all data with the new network
        window.location.reload();
    };

    return {
        selectedNetwork,
        setSelectedNetwork,
        networkOptions,
    };
}
