import { ApiResponse, StatusResponse } from '../../types';
import { fetchApi } from './core';

/**
 * Get indexer status
 * @param network - Optional network parameter
 */
export async function getStatus(network?: string): Promise<ApiResponse<StatusResponse>> {
    return fetchApi<ApiResponse<StatusResponse>>(`/status`, network);
}
