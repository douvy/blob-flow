"use client";

import { useState, useEffect } from 'react';
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

    // Find the network object that matches the stored network name
    const initialNetwork = Object.values(NETWORKS).find(
        network => network.name === storedNetwork
    ) || DEFAULT_NETWORK;

    const [selectedNetwork, setSelectedNetworkState] = useState(initialNetwork);

    // Get all network options
    const networkOptions = Object.values(NETWORKS);

    // Update the selected network and store it in local storage
    const setSelectedNetwork = (network: typeof DEFAULT_NETWORK) => {
        setSelectedNetworkState(network);
        setStoredNetwork(network.name);

        // Force a page reload to refresh all data with the new network
        window.location.reload();
    };

    // Ensure hydration matching by only setting the network after mounting
    useEffect(() => {
        const networkFromStorage = Object.values(NETWORKS).find(
            network => network.name === storedNetwork
        );
        if (networkFromStorage) {
            setSelectedNetworkState(networkFromStorage);
        }
    }, [storedNetwork]);

    return {
        selectedNetwork,
        setSelectedNetwork,
        networkOptions,
    };
}
