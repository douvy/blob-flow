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
  transaction_url?: string;
  from_address: string;
  from_address_url?: string;
  block_url?: string;
  blob_size_bytes: number;
  base_fee_per_blob_gas: string;
  base_fee_per_blob_gas_gwei?: string;
  tip_per_blob_gas: string;
  tip_per_blob_gas_gwei?: string;
  total_cost_eth: string;
  timestamp: string;
  confirmed: boolean;
  user_attribution?: string;
  max_fee_per_blob_gas?: string;
  max_fee_per_blob_gas_gwei?: string;
  blob_gas_used?: number;
  realized_cost_wei?: string;
  max_cost_wei?: string;
  fee_cap_headroom_wei?: string;
  fee_cap_headroom_percent?: string;
}

// Frontend Block type (transformed from BlobResponse for display)
export interface Block {
  id: number;
  number: string;
  blockUrl?: string;
  blobCount: number;
  blobGasUsed: number;
  blobGasTarget: number;
  blobGasLimit: number;
  targetBlobs: number;
  maxBlobs: number;
  availableBlobs: number;
  baseFeeGwei: string;
  utilizationPercent: number;
  isFull: boolean;
  isAboveTarget: boolean;
  timestamp: string;
  attribution: string[];
}

export interface PricingBlobParams {
  target: number;
  max: number;
  update_fraction: number;
  target_gas: number;
  max_gas: number;
}

export interface PricingNextBlockFeeEstimate {
  low: string;
  high: string;
}

export interface PricingMarketPressure {
  recent_blocks_above_target: number;
  consecutive_full_blocks: number;
  percent_recent_blocks_at_max_blobs: number;
  predicted_direction: string;
  next_block_fee_estimate: PricingNextBlockFeeEstimate;
}

export interface RecentBlockResponse {
  block_number: number;
  block_timestamp: string;
  blob_count: number;
  blob_gas_used: number;
  blob_gas_target: number;
  blob_gas_limit: number;
  excess_blob_gas: number;
  blob_base_fee: string;
  blob_base_fee_gwei: string;
  utilization_ratio: string;
  blob_params_target: number;
  blob_params_max: number;
  target_blobs: number;
  max_blobs: number;
  available_blobs: number;
  utilization_percent: number;
  is_full: boolean;
  is_above_target: boolean;
  update_fraction: number;
}

export interface PricingResponse {
  network_id: number;
  network_name: string;
  current_base_fee: string;
  current_base_fee_gwei: string;
  current_excess_gas: number;
  current_utilization: string;
  predicted_next_fee: string;
  predicted_next_fee_gwei: string;
  fork_stage: string;
  blob_params: PricingBlobParams;
  market_pressure: PricingMarketPressure;
  recent_blocks: RecentBlockResponse[];
}

// Latest blocks response (frontend-shaped)
export interface LatestBlocksResponse {
  data: Block[];
}

// Mempool transaction type (transformed for display)
export interface MempoolTransaction {
  id: number;
  txHash: string;
  transactionUrl?: string;
  fromAddress: string;
  fromAddressFull: string;
  fromAddressUrl?: string;
  user: string | null;
  blobCount: number;
  blobSizeBytes: number;
  baseFeeGwei: string;
  tipGwei: string;
  maxFeeGwei: string;
  feeHeadroom: string;
  realizedCost: string;
  maxCost: string;
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

// ---- Chart Data Types ----

export interface BaseFeeDataPoint {
  timestamp: number;
  label: string;
  baseFeeGwei: number;
  blockNumber?: number;
}

export interface GasUtilizationDataPoint {
  timestamp: number;
  label: string;
  blockNumber: number;
  blobGasUsed: number;
  targetGas: number;
  blobCount: number;
  utilizationPct: number;
}

export interface L2UsageDataPoint {
  timestamp: number;
  label: string;
  arbitrum: number;
  optimism: number;
  base: number;
  zksync: number;
  unknown: number;
  total: number;
}

export interface CostComparisonDataPoint {
  timestamp: number;
  label: string;
  blobCostEth: number;
  calldataEquivEth: number;
  savingsPct: number;
}

export interface FeeMarketIndicators {
  currentBaseFeeGwei: number;
  averageBaseFeeGwei: number;
  feeRatio: number;
  pendingBlobCount: number;
  recentBaseFeeSparkline: number[];
}

export type Granularity = 'block' | 'hourly' | 'daily';

export interface ChartDataset {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
  l2Usage: L2UsageDataPoint[];
  costComparison: CostComparisonDataPoint[];
  indicators: FeeMarketIndicators;
  granularity: Granularity;
}
