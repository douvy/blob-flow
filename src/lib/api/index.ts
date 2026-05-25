import { getLatestBlocks, getBlobByTxHash } from './blocks';
import { getRawBlobs } from './blobs';
import { getMempool, getMempoolPressure } from './mempool';
import { getBlobPricing } from './pricing';
import { getStats } from './stats';
import { getStatus } from './status';
import { getTopUsers, getUserByAddress, getUserBlobs } from './users';

export const api = {
    getLatestBlocks,
    getBlobByTxHash,
    getRawBlobs,
    getStats,
    getStatus,
    getMempool,
    getMempoolPressure,
    getBlobPricing,
    getTopUsers,
    getUserByAddress,
    getUserBlobs,
};

export default api;
