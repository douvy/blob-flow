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

export interface BackendFeeDistribution {
  min: string;
  avg: string;
  median: string;
  p95: string;
  max: string;
}

export interface BackendPendingTransactionAge {
  oldest_age_seconds: number;
  newest_age_seconds: number;
  average_age_seconds: number;
  oldest_timestamp: string;
  newest_timestamp: string;
}

export interface BackendMempoolIncludability {
  latest_blob_base_fee: string;
  pricing_available: boolean;
  likely_includable_count: number;
  underpriced_count: number;
  unknown_pricing_count: number;
}

export interface BackendMempoolPressureResponse {
  network_id: number;
  network_name: string;
  pending_blob_count: number;
  pending_blob_gas: number;
  pending_unique_senders: number;
  max_fee_per_blob_gas: BackendFeeDistribution;
  pending_tx_age: BackendPendingTransactionAge;
  includability: BackendMempoolIncludability;
  sample_limit: number;
  sample_truncated: boolean;
  generated_at: string;
}

export interface FeeDistribution {
  min: string;
  avg: string;
  median: string;
  p95: string;
  max: string;
}

export interface PendingTransactionAge {
  oldest: string;
  newest: string;
  average: string;
  oldestSeconds: number;
  newestSeconds: number;
  averageSeconds: number;
  oldestTimestamp: string;
  newestTimestamp: string;
}

export interface MempoolIncludability {
  latestBlobBaseFee: string;
  pricingAvailable: boolean;
  likelyIncludableCount: number;
  underpricedCount: number;
  unknownPricingCount: number;
}

export interface MempoolPressure {
  networkId: number;
  networkName: string;
  pendingBlobCount: number;
  pendingBlobGas: number;
  pendingUniqueSenders: number;
  feeDistribution: FeeDistribution;
  pendingTransactionAge: PendingTransactionAge;
  includability: MempoolIncludability;
  sampleLimit: number;
  sampleTruncated: boolean;
  generatedAt: string;
}

export interface BlobPricingParams {
  target: number;
  max: number;
  updateFraction: number;
  targetGas: number;
  maxGas: number;
}

export interface BackendBlobPricingParams {
  target: number;
  max: number;
  update_fraction: number;
  target_gas: number;
  max_gas: number;
}

export interface BackendNextBlockFeeEstimate {
  low: string;
  high: string;
}

export interface BackendBlobMarketPressure {
  recent_blocks_above_target: number;
  consecutive_full_blocks: number;
  percent_recent_blocks_at_max_blobs: number;
  predicted_direction: string;
  next_block_fee_estimate: BackendNextBlockFeeEstimate;
}

export interface BlobMarketPressure {
  recentBlocksAboveTarget: number;
  consecutiveFullBlocks: number;
  percentRecentBlocksAtMaxBlobs: number;
  predictedDirection: string;
  nextBlockFeeEstimate: {
    low: string;
    high: string;
  };
}

export interface BackendBlobPricingRecentBlock {
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

export interface BlobPricingRecentBlock {
  blockNumber: number;
  blockTimestamp: string;
  blobCount: number;
  blobGasUsed: number;
  blobGasTarget: number;
  blobGasLimit: number;
  excessBlobGas: number;
  blobBaseFee: string;
  blobBaseFeeGwei: string;
  utilizationRatio: number;
  targetBlobs: number;
  maxBlobs: number;
  availableBlobs: number;
  utilizationPercent: number;
  isFull: boolean;
  isAboveTarget: boolean;
}

export interface BackendBlobPricingResponse {
  network_id: number;
  network_name: string;
  current_base_fee: string;
  current_base_fee_gwei: string;
  current_excess_gas: number;
  current_utilization: string;
  predicted_next_fee: string;
  predicted_next_fee_gwei: string;
  fork_stage: string;
  blob_params: BackendBlobPricingParams;
  market_pressure: BackendBlobMarketPressure;
  recent_blocks: BackendBlobPricingRecentBlock[];
}

export interface BlobPricing {
  networkId: number;
  networkName: string;
  currentBaseFee: string;
  currentBaseFeeGwei: string;
  currentExcessGas: number;
  currentUtilization: number;
  predictedNextFee: string;
  predictedNextFeeGwei: string;
  forkStage: string;
  blobParams: BlobPricingParams;
  marketPressure: BlobMarketPressure;
  recentBlocks: BlobPricingRecentBlock[];
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
