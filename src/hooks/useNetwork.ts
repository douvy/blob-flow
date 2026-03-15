"use client";

import { NETWORKS, DEFAULT_NETWORK } from '../constants';
import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook for managing network selection
 * @returns Object with selected network, setter, and network options
 */
export function useNetwork() {
    // Use local storage to persist the selected network
    const [storedNetwork, setStoredNetwork] = useLocalStorage(
        'selectedNetwork',
        DEFAULT_NETWORK.name
    );

    // Derive selected network from stored name — stays in sync without a separate effect
    const selectedNetwork = Object.values(NETWORKS).find(
        network => network.name === storedNetwork
    ) || DEFAULT_NETWORK;

    // Get all network options
    const networkOptions = Object.values(NETWORKS);

    // Update the selected network and store it in local storage
    const setSelectedNetwork = (network: typeof DEFAULT_NETWORK) => {
        setStoredNetwork(network.name);

        // Force a page reload to refresh all data with the new network
        window.location.reload();
    };

    return {
        selectedNetwork,
        setSelectedNetwork,
        networkOptions,
    };
}
