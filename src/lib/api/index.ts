import { getBlockByNumber, getLatestBlocks, getBlobByTxHash, getBlobByVersionedHash } from './blocks';
import { getRawBlobs } from './blobs';
import { search } from './search';
import {
    getAttributionUsageChart,
    getBlobMarketChart,
    getCostComparisonChart,
    getRollingStatsChart,
} from './charts';
import { getMempool } from './mempool';
import { getNetworks } from './networks';
import { getBlobPricing } from './pricing';
import { getBlobRecords } from './records';
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
    getBlobRecords,
    getBlobMarketChart,
    getAttributionUsageChart,
    getCostComparisonChart,
    getRollingStatsChart,
    getStats,
    getStatsWindows,
    getStatus,
    getMempool,
    getNetworks,
    getTopUsers,
    getUserByAddress,
    getUserBlobs,
};

export default api;
