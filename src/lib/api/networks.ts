import { ApiResponse, BackendNetwork } from '../../types';
import { fetchApi } from './core';

/**
 * Get the list of networks the indexer serves.
 * Drives the header network selector, so it is not scoped to a single network.
 */
export async function getNetworks(): Promise<ApiResponse<BackendNetwork[]>> {
    return fetchApi<ApiResponse<BackendNetwork[]>>(`/networks`);
}
