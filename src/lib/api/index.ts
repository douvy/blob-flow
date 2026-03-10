import { getLatestBlocks, getBlobByTxHash } from './blocks';
import { getMempool } from './mempool';
import { getStats } from './stats';
import { getStatus } from './status';
import { getTopUsers, getUserById } from './users';

export const api = {
    getLatestBlocks,
    getBlobByTxHash,
    getStats,
    getStatus,
    getMempool,
    getTopUsers,
    getUserById,
};

export default api;
