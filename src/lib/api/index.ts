import { getBlockByNumber, getLatestBlocks, getBlobByTxHash, getBlobByVersionedHash } from './blocks';
import { getRawBlobs } from './blobs';
import { search } from './search';
import {
    getAttributionUsageChart,
    getBlobMarketChart,
    getCostComparisonChart,
    getRollingStatsChart,
} from './charts';
import { getMempool, getMempoolPressure } from './mempool';
import { getBlobPricing } from './pricing';
import { getStats, getStatsWindows } from './stats';
import { getStatus } from './status';
import { getTopUsers, getUserByAddress, getUserBlobs } from './users';

export const api = {
    getLatestBlocks,
    getBlockByNumber,
    getBlobByTxHash,
    getBlobByVersionedHash,
    search,
    getRawBlobs,
    getBlobPricing,
    getBlobMarketChart,
    getAttributionUsageChart,
    getCostComparisonChart,
    getRollingStatsChart,
    getStats,
    getStatsWindows,
    getStatus,
    getMempool,
    getMempoolPressure,
    getTopUsers,
    getUserByAddress,
    getUserBlobs,
};

export default api;
