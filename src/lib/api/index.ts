import { getBlockByNumber, getLatestBlocks, getBlobByTxHash, getBlobByVersionedHash } from './blocks';
import { getBlobReplacements, getRawBlobs } from './blobs';
import { search } from './search';
import {
    getAttributionUsageChart,
    getBlobMarketChart,
    getBlobTipsChart,
    getCostComparisonChart,
    getRollingStatsChart,
} from './charts';
import { getBuilderByKey, getBuilderShareChart, getBuilders } from './builders';
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
    getBlobReplacements,
    getBlobPricing,
    getBlobRecords,
    getBlobMarketChart,
    getAttributionUsageChart,
    getCostComparisonChart,
    getBlobTipsChart,
    getRollingStatsChart,
    getBuilders,
    getBuilderByKey,
    getBuilderShareChart,
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
