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

// ---- WebSocket Live Data Types ----

export type BlobWebSocketConnectionState =
  | 'connecting'
  | 'connected'
  | 'stale'
  | 'reconnecting'
  | 'disconnected';

export type SubscribableBlobEventType =
  | 'new_block'
  | 'mempool_update'
  | 'stats_update'
  | 'users_update';

export type BlobWebSocketEventType = SubscribableBlobEventType | 'ping' | 'pong';

export interface NewBlockData {
  block_number: number;
  blob_count: number;
  timestamp: string;
  blobs: BlobResponse[];
}

export interface NewBlockEvent {
  type: 'new_block';
  data: NewBlockData;
}

export type MempoolUpdateData =
  | {
      action: 'add';
      blob: BlobResponse;
    }
  | {
      action: 'remove';
      blob: Pick<BlobResponse, 'network_id' | 'network_name' | 'tx_hash'>;
    };

export interface MempoolUpdateEvent {
  type: 'mempool_update';
  data: MempoolUpdateData;
}

export type WebSocketStatsResponse = Omit<BackendStatsResponse, 'network_id' | 'network_name'> &
  Partial<Pick<BackendStatsResponse, 'network_id' | 'network_name'>>;

export interface StatsUpdateEvent {
  type: 'stats_update';
  data: WebSocketStatsResponse;
}

export interface UsersUpdateEvent {
  type: 'users_update';
  data: UserResponse[];
}

export interface PingEvent {
  type: 'ping';
}

export interface PongEvent {
  type: 'pong';
}

export type HeartbeatEvent = PingEvent | PongEvent;

export type BlobWebSocketEvent =
  | NewBlockEvent
  | MempoolUpdateEvent
  | StatsUpdateEvent
  | UsersUpdateEvent
  | HeartbeatEvent;

export type LiveBlobWebSocketEvent = Exclude<BlobWebSocketEvent, HeartbeatEvent>;

export interface BlobWebSocketEventMap {
  new_block: NewBlockEvent;
  mempool_update: MempoolUpdateEvent;
  stats_update: StatsUpdateEvent;
  users_update: UsersUpdateEvent;
}

export type LatestBlobWebSocketEvents = {
  [EventType in SubscribableBlobEventType]?: BlobWebSocketEventMap[EventType];
};

export interface BlobWebSocketSubscribeMessage {
  subscribe: SubscribableBlobEventType[];
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
  network_name?: string;
  address: string;
  name?: string;
  category?: string;
  blob_count: number;
  total_cost_eth: string;
  last_timestamp: string;
  blob_share_percent?: number;
  spend_share_percent?: number;
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

// Rolling stats response from /stats/windows
export type RollingWindowKey = '5m' | '1h' | '24h' | '7d' | '30d';

export interface BackendStatsWindow {
  window: RollingWindowKey | string;
  duration_seconds: number;
  start_time: string;
  end_time: string;
  average_blob_base_fee: string;
  median_blob_base_fee: string;
  p95_blob_base_fee: string;
  total_blobs: number;
  total_blob_gas_used: number;
  average_utilization: string;
  total_cost_eth: string;
  unique_senders: number;
}

export interface BackendStatsWindowsResponse {
  network_id: number;
  network_name: string;
  generated_at: string;
  windows: BackendStatsWindow[];
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

// Blob fee market response from /blob/pricing
export interface BlobPricingParams {
  target: number;
  max: number;
  update_fraction: number;
  target_gas: number;
  max_gas: number;
}

export interface BlobPricingPressure {
  recent_blocks_above_target: number;
  consecutive_full_blocks: number;
  percent_recent_blocks_at_max_blobs: number;
  predicted_direction: string;
  next_block_fee_estimate: {
    low: string;
    high: string;
  };
}

export interface BlobPricingBlock {
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

export interface BlobPricingResponse {
  network_id: number;
  network_name: string;
  current_base_fee: string;
  current_base_fee_gwei: string;
  current_excess_gas: number;
  current_utilization: string;
  predicted_next_fee: string;
  predicted_next_fee_gwei: string;
  fork_stage: string;
  blob_params: BlobPricingParams;
  market_pressure: BlobPricingPressure;
  recent_blocks: BlobPricingBlock[];
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

export interface RollingWindowDataPoint {
  window: RollingWindowKey | string;
  label: string;
  durationSeconds: number;
  startTimestamp: number;
  endTimestamp: number;
  averageBaseFeeGwei: number;
  medianBaseFeeGwei: number;
  p95BaseFeeGwei: number;
  totalBlobs: number;
  totalBlobGasUsed: number;
  averageUtilizationPct: number;
  totalCostEth: number;
  uniqueSenders: number;
}

export interface ChartDataset {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
  l2Usage: L2UsageDataPoint[];
  costComparison: CostComparisonDataPoint[];
  rollingWindows: RollingWindowDataPoint[];
  selectedWindow: RollingWindowDataPoint | null;
  indicators: FeeMarketIndicators;
  granularity: Granularity;
  recentBlockCount: number;
  coverageLabel: string;
  rollingCoverageLabel: string;
  blockCoverageLabel: string;
}
