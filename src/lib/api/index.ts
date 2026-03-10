import { getLatestBlocks, getBlobByTxHash } from './blocks';
import { getRawBlobs } from './blobs';
import { getMempool } from './mempool';
import { getStats } from './stats';
import { getStatus } from './status';
import { getTopUsers, getUserById } from './users';

export const api = {
    getLatestBlocks,
    getBlobByTxHash,
    getRawBlobs,
    getStats,
    getStatus,
    getMempool,
    getTopUsers,
    getUserById,
};

export default api;
