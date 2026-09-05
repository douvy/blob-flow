import { getBlockByNumber, getLatestBlocks, getBlobByTxHash, getBlobByVersionedHash } from './blocks';
import { getRawBlobs } from './blobs';
import { search } from './search';
import {
    getAttributionUsageChart,
    getBlobMarketChart,
    getBlobTipsChart,
    getCostComparisonChart,
    getRollingStatsChart,
} from './charts';
import { getEntityBlobs, getEntityBySlug } from './entities';
import { getMempool } from './mempool';
import { getNetworks } from './networks';
import { getBlobPricing } from './pricing';
import { getBlobRecords } from './records';
import { getStats, getStatsWindows } from './stats';
import { getStatus } from './status';
import { getBlobTransaction } from './transactions';
import { getTopUsers, getUserByAddress, getUserBlobs } from './users';

export const api = {
    getLatestBlocks,
    getBlockByNumber,
    getBlobByTxHash,
    getBlobByVersionedHash,
    getBlobTransaction,
    search,
    getRawBlobs,
    getBlobPricing,
    getBlobRecords,
    getBlobMarketChart,
    getAttributionUsageChart,
    getCostComparisonChart,
    getBlobTipsChart,
    getRollingStatsChart,
    getStats,
    getStatsWindows,
    getStatus,
    getMempool,
    getNetworks,
    getTopUsers,
    getUserByAddress,
    getUserBlobs,
    getEntityBySlug,
    getEntityBlobs,
};

export default api;
