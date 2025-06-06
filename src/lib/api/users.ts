import { TopUsersResponse, User, UserDetail } from '../../types';
import { fetchApi, formatRelativeTime } from './core';

/**
 * Get top users data with pagination
 * @param page - Page number (starts at 1)
 * @param limit - Number of items per page
 * @param network - Optional network parameter
 */
export async function getTopUsers(page = 1, limit = 5, network?: string): Promise<TopUsersResponse> {
    // Convert page-based pagination to cursor-based pagination
    const cursor = page > 1 ? `page_${page}` : '';

    const response = await fetchApi<any>(`/users?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`, network);

    // Get total blob count to calculate percentages
    const statsResponse = await fetchApi<any>(`/stats`, network);
    const totalBlobs = statsResponse.data.total_blobs || 1000; // Fallback value

    // Map the API response to our expected format
    const users: User[] = response.data.map((user: any, index: number) => {
        // Calculate percentage
        const percentage = Math.round((user.blob_count / totalBlobs) * 1000) / 10;

        return {
            id: index + 1,
            name: user.name || (user.address ? `${user.address.substring(0, 6)}...` : 'Unknown'),
            dataCount: user.blob_count,
            percentage
        };
    });

    return {
        data: users,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(response.pagination.total_items / limit),
            totalItems: response.pagination.total_items,
            itemsPerPage: limit
        }
    };
}

/**
 * Get specific user details by ID
 * @param userId - User ID to retrieve
 * @param network - Optional network parameter
 */
export async function getUserById(userId: number, network?: string): Promise<{ data: UserDetail }> {
    // In a real implementation, we would fetch the user by ID
    // For now, we'll use the top users endpoint and filter by ID
    const topUsersResponse = await getTopUsers(1, 10, network);
    const user = topUsersResponse.data.find(u => u.id === userId);

    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    // Create the user detail object with empty transactions
    const userDetail: UserDetail = {
        ...user,
        transactions: [],
        totalCost: '0 ETH',
        avgCostPerBlob: '0 ETH',
        firstSeen: 'Unknown',
        latestActivity: 'Unknown'
    };

    return { data: userDetail };
}
