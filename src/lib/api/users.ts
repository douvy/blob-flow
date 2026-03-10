import { TopUsersResponse, User, ApiResponse, UserResponse, BlobResponse } from '../../types';
import { fetchApi } from './core';
import { truncateAddress } from '../../utils';

/**
 * Get top blob users
 * @param limit - Number of users to return
 * @param network - Optional network parameter
 */
export const getTopUsers = async (limit = 10, network?: string): Promise<TopUsersResponse> => {
    const response = await fetchApi<ApiResponse<UserResponse[]>>(`/users?limit=${limit}`, network);

    // Calculate total blobs across all returned users for percentage calculation
    const totalBlobs = response.data.reduce((sum, user) => sum + user.blob_count, 0) || 1;

    // Map the API response to our expected format
    const users: User[] = response.data.map((user: UserResponse, index: number) => {
        const percentage = Math.round((user.blob_count / totalBlobs) * 1000) / 10;

        return {
            id: index + 1,
            name: user.name || truncateAddress(user.address),
            address: user.address,
            dataCount: user.blob_count,
            percentage,
            totalCostEth: user.total_cost_eth,
            lastTimestamp: user.last_timestamp
        };
    });

    return { data: users };
};

/**
 * Get a single user's aggregated stats by address
 * @param address - Ethereum address
 * @param network - Optional network parameter
 */
export const getUserByAddress = async (address: string, network?: string): Promise<UserResponse> => {
    const response = await fetchApi<ApiResponse<UserResponse>>(`/users/${address}`, network);
    return response.data;
};

/**
 * Get blobs for a specific user address
 * @param address - Ethereum address
 * @param confirmed - true for confirmed blobs, false for mempool
 * @param limit - Number of blobs to return
 * @param network - Optional network parameter
 */
export const getUserBlobs = async (address: string, confirmed: boolean, limit = 20, network?: string): Promise<BlobResponse[]> => {
    const endpoint = confirmed ? '/blob/latest' : '/blob/mempool';
    const response = await fetchApi<ApiResponse<BlobResponse[]>>(`${endpoint}?from=${address}&limit=${limit}`, network);
    return response.data;
};
