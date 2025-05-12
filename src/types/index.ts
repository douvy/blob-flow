// Metric type definition
export interface Metric {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: string;
}

// Block type definition
export interface Block {
  id: number;
  number: string;
  blobCount: number;
  timestamp: string;
  attribution: string[];
}

// API Response interfaces for backend integration
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Latest blocks response
export interface LatestBlocksResponse extends PaginatedResponse<Block> {}

// Mempool transaction type
export interface MempoolTransaction {
  id: number;
  txHash: string;
  fromAddress: string;
  user: string | null;
  blobCount: number;
  estimatedCost: string;
  timeInMempool: string;
}

// Mempool response
export interface MempoolResponse extends PaginatedResponse<MempoolTransaction> {}

// User data type
export interface User {
  id: number;
  name: string;
  dataCount: number;
  percentage: number;
  dataIds: string[];
}

// Top users response
export interface TopUsersResponse extends PaginatedResponse<User> {}

// Stats type definitions
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

export interface NetworkStats {
  currentBlobBaseFee: string;
  blobBaseFeeChange: number;
  pendingBlobsCount: number;
  avgBlobsPerBlock: number;
  blobVsCalldataSavings: string;
  timeFrames: {
    '24h': TimeSeriesData;
    '7d': TimeSeriesData;
    '30d': TimeSeriesData;
    'all': TimeSeriesData;
  };
}

export interface TimeSeriesData {
  blobBaseFees: TimeSeriesDataPoint[];
  blobsPerBlock: TimeSeriesDataPoint[];
  costComparison: TimeSeriesDataPoint[];
  attribution: {
    [network: string]: number;
  };
}

// Stats response
export interface StatsResponse {
  data: NetworkStats;
}