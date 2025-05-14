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
     */
    getLatestBlocks,

    /**
     * Get specific block by number
     * @param blockNumber - Block number to retrieve
     */
    getBlockByNumber,

    /**
     * Get specific blob transaction by hash
     * @param txHash - Transaction hash to retrieve
     */
    getBlobByTxHash,

    /**
     * Get network stats data
     * @param timeframe - Optional timeframe filter (24h, 7d, 30d, all)
     */
    getStats,

    /**
     * Get mempool data (pending transactions) with pagination
     * @param page - Page number (starts at 1)
     * @param limit - Number of items per page
     */
    getMempool,

    /**
     * Get top users data with pagination
     * @param page - Page number (starts at 1)
     * @param limit - Number of items per page
     */
    getTopUsers,

    /**
     * Get specific user details by ID
     * @param userId - User ID to retrieve
     */
    getUserById,
};

export default api;
