import { ApiResponse, SearchMatchResponse } from '../../types';
import { fetchApi } from './core';

/**
 * Resolve a free-form search query into typed matches (blocks, transactions,
 * blobs, addresses, rollup names). Returns an empty array when nothing
 * matches — for a type-ahead endpoint that is the normal outcome.
 * @param query - Search query: block height, 0x-hash, address, or rollup-name prefix
 * @param network - Optional network parameter
 */
export async function search(query: string, network?: string): Promise<SearchMatchResponse[]> {
    const response = await fetchApi<ApiResponse<SearchMatchResponse[]>>(
        `/search?q=${encodeURIComponent(query)}`,
        network
    );
    return response.data ?? [];
}
