import { getLatestBlocks, getBlockByNumber, getBlobByTxHash } from './blocks';
import { getMempool } from './mempool';
import { getStats } from './stats';
import { getTopUsers, getUserById } from './users';

/**
 * API methods for different endpoints with strong typing
 */
export const api = {
    /**
     * Get latest blocks with pagination
     * @param page - Page number (starts at 1)
     * @param limit - Number of items per page
     * @param network - Optional network parameter
     */
    getLatestBlocks,

    /**
     * Get specific block by number
     * @param blockNumber - Block number to retrieve
     * @param network - Optional network parameter
     */
    getBlockByNumber,

    /**
     * Get specific blob transaction by hash
     * @param txHash - Transaction hash to retrieve
     * @param network - Optional network parameter
     */
    getBlobByTxHash,

    /**
     * Get network stats data
     * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
     * @param network - Optional network parameter
     */
    getStats,

    /**
     * Get mempool data (pending transactions) with pagination
     * @param page - Page number (starts at 1)
     * @param limit - Number of items per page
     * @param network - Optional network parameter
     */
    getMempool,

    /**
     * Get top users data with pagination
     * @param page - Page number (starts at 1)
     * @param limit - Number of items per page
     * @param network - Optional network parameter
     */
    getTopUsers,

    /**
     * Get specific user details by ID
     * @param userId - User ID to retrieve
     * @param network - Optional network parameter
     */
    getUserById,
};

export default api;
