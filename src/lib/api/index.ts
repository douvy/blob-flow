import { getLatestBlocks, getBlobByTxHash } from './blocks';
import { getBlobPricing, getRawBlobs } from './blobs';
import { getMempool } from './mempool';
import { getStats, getStatsWindows } from './stats';
import { getStatus } from './status';
import { getTopUsers, getUserByAddress, getUserBlobs } from './users';

export const api = {
    getLatestBlocks,
    getBlobByTxHash,
    getRawBlobs,
    getBlobPricing,
    getStats,
    getStatsWindows,
    getStatus,
    getMempool,
    getTopUsers,
    getUserByAddress,
    getUserBlobs,
};

export default api;
