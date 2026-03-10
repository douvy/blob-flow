// Metric type definition (UI only)
export interface Metric {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: string;
}

// Generic API response wrapper from backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Backend BlobResponse - matches api.BlobResponse from swagger
export interface BlobResponse {
  network_id: number;
  network_name: string;
  block_number: number;
  blob_index: number;
  tx_hash: string;
  from_address: string;
  blob_size_bytes: number;
  base_fee_per_blob_gas: string;
  tip_per_blob_gas: string;
  total_cost_eth: string;
  timestamp: string;
  confirmed: boolean;
  user_attribution?: string;
  max_fee_per_blob_gas?: string;
  blob_gas_used?: number;
}

// Frontend Block type (transformed from BlobResponse for display)
export interface Block {
  id: number;
  number: string;
  blobCount: number;
  timestamp: string;
  attribution: string[];
}

// Latest blocks response (frontend-shaped)
export interface LatestBlocksResponse {
  data: Block[];
}

// Mempool transaction type (transformed for display)
export interface MempoolTransaction {
  id: number;
  txHash: string;
  fromAddress: string;
  user: string | null;
  blobCount: number;
  estimatedCost: string;
  timeInMempool: string;
}

// Mempool response (frontend-shaped)
export interface MempoolResponse {
  data: MempoolTransaction[];
}

// Backend UserResponse - matches api.UserResponse from swagger
export interface UserResponse {
  network_id: number;
  network_name: string;
  address: string;
  name?: string;
  blob_count: number;
  total_cost_eth: string;
  last_timestamp: string;
}

// Frontend User type (transformed for display)
export interface User {
  id: number;
  name: string;
  address: string;
  dataCount: number;
  percentage: number;
  totalCostEth: string;
  lastTimestamp: string;
}

// Transaction details for user detail view
export interface UserTransaction {
  id: string;
  status: 'confirmed' | 'pending';
  cost: string;
  blockNumber?: string;
  timestamp: string;
}

// Detailed user data with transactions
export interface UserDetail extends User {
  transactions: UserTransaction[];
  totalCost: string;
  avgCostPerBlob: string;
  firstSeen: string;
  latestActivity: string;
}

// Top users response (frontend-shaped)
export interface TopUsersResponse {
  data: User[];
}

// Backend StatsResponse - matches api.StatsResponse from swagger
export interface BackendStatsResponse {
  network_id: number;
  network_name: string;
  total_blobs: number;
  total_confirmed_blobs: number;
  total_pending_blobs: number;
  average_base_fee: string;
  average_tip: string;
  average_total_cost: string;
  last_indexed_block: number;
  last_indexed_time: string;
}

// Frontend NetworkStats (transformed for display)
export interface NetworkStats {
  averageBaseFee: string;
  totalBlobs: number;
  totalConfirmedBlobs: number;
  pendingBlobsCount: number;
  avgBlobsPerBlock: number;
  averageTip: string;
  averageTotalCost: string;
  lastIndexedBlock: number;
  lastIndexedTime: string;
}

// Stats response (frontend-shaped)
export interface StatsResponse {
  data: NetworkStats;
}

// Backend StatusResponse - matches api.StatusResponse from swagger
export interface StatusResponse {
  network_id: number;
  network_name: string;
  last_indexed_block: number;
  indexer_version: string;
  uptime: string;
  last_indexed_time: string;
}
