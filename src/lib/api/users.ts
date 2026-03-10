import { TopUsersResponse, User, UserDetail, ApiResponse, UserResponse } from '../../types';
import { fetchApi } from './core';
import { truncateAddress } from '../../utils';

/**
 * Get top blob users
 * @param limit - Number of users to return
 * @param network - Optional network parameter
 */
export async function getTopUsers(limit = 10, network?: string): Promise<TopUsersResponse> {
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
}

/**
 * Get specific user details by address
 * @param userId - User index in the top users list
 * @param network - Optional network parameter
 */
export async function getUserById(userId: number, network?: string): Promise<{ data: UserDetail }> {
    const topUsersResponse = await getTopUsers(10, network);
    const user = topUsersResponse.data.find(u => u.id === userId);

    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    const userDetail: UserDetail = {
        ...user,
        transactions: [],
        totalCost: user.totalCostEth,
        avgCostPerBlob: '0 ETH',
        firstSeen: 'Unknown',
        latestActivity: user.lastTimestamp
    };

    return { data: userDetail };
}
