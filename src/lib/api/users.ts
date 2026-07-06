import { TopUsersResponse, User, ApiResponse, UserResponse, BlobResponse, BackendUsersRange } from '../../types';
import { fetchApi } from './core';
import { truncateAddress } from '../../utils';

const WEI_PER_ETH = BigInt('1000000000000000000');

export function transformUserResponses(usersResponse: UserResponse[]): TopUsersResponse {
    // Calculate total blobs across all returned users for percentage calculation
    const totalBlobs = usersResponse.reduce((sum, user) => sum + user.blob_count, 0) || 1;

    // Server-side shares are computed over all users in the window; the local
    // fallback only sees the returned rows. The two denominators differ, so
    // mixing them within one column would misstate shares — use the server
    // values only when every row has one.
    const hasServerShares =
        usersResponse.length > 0 &&
        usersResponse.every(
            (user) => typeof user.blob_share_percent === 'number' && Number.isFinite(user.blob_share_percent)
        );

    // Map the API response to our expected format
    const users: User[] = usersResponse.map((user: UserResponse, index: number) => {
        const percentage = hasServerShares && typeof user.blob_share_percent === 'number'
            ? Math.round(user.blob_share_percent * 10) / 10
            : Math.round((user.blob_count / totalBlobs) * 1000) / 10;

        return {
            id: index + 1,
            name: user.name || truncateAddress(user.address),
            address: user.address,
            dataCount: user.blob_count,
            percentage,
            totalCostEth: formatTotalCostEth(user.total_cost_wei, user.total_cost_eth),
            totalCostWei: user.total_cost_wei,
            lastTimestamp: user.last_timestamp
        };
    });

    return { data: users };
}

/**
 * Get top blob users
 * @param limit - Number of users to return
 * @param network - Optional network parameter
 * @param range - Time window to aggregate over
 */
export const getTopUsers = async (limit = 10, network?: string, range: BackendUsersRange = 'all'): Promise<TopUsersResponse> => {
    const response = await fetchApi<ApiResponse<UserResponse[]>>(`/users?limit=${limit}&range=${range}`, network);

    return transformUserResponses(response.data);
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

function formatTotalCostEth(totalCostWei: string | undefined, fallbackTotalCostEth: string): string {
    if (!totalCostWei || !/^\d+$/.test(totalCostWei)) {
        return fallbackTotalCostEth;
    }

    const wei = BigInt(totalCostWei);
    const wholeEth = wei / WEI_PER_ETH;
    const fractionalWei = wei % WEI_PER_ETH;
    const fractionalEth = fractionalWei.toString().padStart(18, '0').replace(/0+$/, '');

    return fractionalEth ? `${wholeEth}.${fractionalEth}` : wholeEth.toString();
}
