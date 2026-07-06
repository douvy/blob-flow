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
  total_cost_wei?: string;
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
  pricing?: BackendBlobPricingRecentBlock;
}

export interface NewBlockEvent {
  type: 'new_block';
  data: NewBlockData;
}

export interface BlockSnapshotData {
  blocks: NewBlockData[];
}

// Sent once by the server on every (re)connect with the most recent blocks,
// newest first, so blocks broadcast during a reconnect window are recovered.
export interface BlockSnapshotEvent {
  type: 'block_snapshot';
  data: BlockSnapshotData;
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
  // Window the aggregates cover; clients drop events that don't match their
  // selected range instead of overwriting a differently-scoped view.
  range: BackendUsersRange;
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
  | BlockSnapshotEvent
  | MempoolUpdateEvent
  | StatsUpdateEvent
  | UsersUpdateEvent
  | HeartbeatEvent;

export type LiveBlobWebSocketEvent = Exclude<BlobWebSocketEvent, HeartbeatEvent>;

export interface BlobWebSocketEventMap {
  new_block: NewBlockEvent;
  block_snapshot: BlockSnapshotEvent;
  mempool_update: MempoolUpdateEvent;
  stats_update: StatsUpdateEvent;
  users_update: UsersUpdateEvent;
}

// Every event type deliverable to live subscribers: the subscribable set plus
// the connection-lifecycle block_snapshot the server always sends.
export type LiveBlobEventType = keyof BlobWebSocketEventMap;

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
  /** ISO-8601 timestamp; formatted for display via `<RelativeTime>`. */
  timestamp: string;
  attribution: string[];
  blobs: BlobResponse[];
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
  /** ISO-8601 timestamp of first-seen; formatted for display via `<RelativeTime>`. */
  timeInMempool: string;
  rawBlob: BlobResponse;
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

// Time window accepted by /users and echoed on users_update events
export type BackendUsersRange = '1h' | '24h' | '7d' | '30d' | 'all';

// Backend UserResponse - matches api.UserResponse from swagger
export interface UserResponse {
  network_id: number;
  network_name?: string;
  address: string;
  name?: string;
  category?: string;
  blob_count: number;
  total_cost_wei?: string;
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
  totalCostWei?: string;
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
  average_base_fee_per_blob_gas_wei?: string;
  average_tip_per_blob_gas_wei?: string;
  average_total_cost_wei?: string;
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
  average_blob_base_fee?: string;
  average_blob_base_fee_wei?: string;
  median_blob_base_fee?: string;
  median_blob_base_fee_wei?: string;
  p95_blob_base_fee?: string;
  p95_blob_base_fee_wei?: string;
  total_blobs: number;
  total_blob_gas_used: number;
  average_utilization: string;
  total_cost_eth?: string;
  total_cost_wei?: string;
  unique_senders: number;
  /** Blocks indexed within the window. Absent on older backends. */
  total_blocks?: number;
  /** Blocks in the window with blob gas usage above target. Absent on older backends. */
  blocks_above_target?: number;
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

// ---- Chart Data Types ----

export type BackendChartRange = '1h' | '24h' | '7d' | '30d' | 'all';
export type BackendChartGranularity = 'auto' | 'block' | 'minute' | 'hour' | 'day';

export interface BackendBlobMarketChartPoint {
  timestamp: string;
  label?: string;
  start_block?: number;
  end_block?: number;
  average_blob_base_fee_gwei: string;
  median_blob_base_fee_gwei: string;
  p95_blob_base_fee_gwei: string;
  blob_count: number;
  blob_gas_used: number;
  blob_gas_target: number;
  blob_gas_limit?: number;
  average_utilization: string;
  total_cost_wei: string;
  unique_senders: number;
}

export interface BackendBlobMarketChartSummary {
  current_base_fee_gwei: string;
  average_blob_base_fee_gwei: string;
  median_blob_base_fee_gwei: string;
  p95_blob_base_fee_gwei: string;
  total_blobs: number;
  total_blob_gas_used: number;
  average_utilization: string;
  total_cost_wei: string;
  unique_senders: number;
}

export interface BackendBlobMarketChartResponse {
  network_id: number;
  network_name: string;
  range: BackendChartRange | string;
  granularity: Exclude<BackendChartGranularity, 'auto'> | string;
  bucket_seconds: number;
  start_time: string;
  end_time: string;
  generated_at: string;
  points: BackendBlobMarketChartPoint[];
  summary: BackendBlobMarketChartSummary;
}

export interface BackendAttributionUsageSeries {
  key: string;
  name: string;
  category: string;
  address?: string;
}

export interface BackendAttributionUsageValue {
  blob_count: number;
  total_cost_wei: string;
  blob_gas_used: number;
}

export interface BackendAttributionUsagePoint {
  timestamp: string;
  start_block?: number;
  end_block?: number;
  values: Record<string, BackendAttributionUsageValue>;
}

export interface BackendAttributionUsageShare {
  key: string;
  name: string;
  category: string;
  blob_count: number;
  total_cost_wei: string;
  blob_share_percent: number;
  spend_share_percent: number;
}

export interface BackendAttributionUsageSummary {
  total_blobs: number;
  total_cost_wei: string;
  shares: BackendAttributionUsageShare[];
}

export interface BackendAttributionUsageChartResponse {
  network_id: number;
  network_name: string;
  range: BackendChartRange | string;
  granularity: Exclude<BackendChartGranularity, 'auto'> | string;
  bucket_seconds: number;
  start_time: string;
  end_time: string;
  generated_at: string;
  series: BackendAttributionUsageSeries[];
  points: BackendAttributionUsagePoint[];
  summary: BackendAttributionUsageSummary;
}

export interface BackendCostComparisonChartPoint {
  timestamp: string;
  blob_count: number;
  blob_bytes: number;
  blob_cost_wei: string;
  calldata_equivalent_cost_wei: string;
  savings_wei: string;
  savings_percent: number;
  average_execution_base_fee_wei?: string;
}

export interface BackendCostComparisonModel {
  calldata_gas_per_byte: number;
  blob_size_bytes: number;
  description: string;
}

export interface BackendCostComparisonSummary {
  blob_cost_wei: string;
  calldata_equivalent_cost_wei: string;
  savings_wei: string;
  savings_percent: number;
}

export interface BackendCostComparisonChartResponse {
  network_id: number;
  network_name: string;
  range: BackendChartRange | string;
  granularity: Exclude<BackendChartGranularity, 'auto'> | string;
  bucket_seconds: number;
  start_time: string;
  end_time: string;
  generated_at: string;
  model: BackendCostComparisonModel;
  points: BackendCostComparisonChartPoint[];
  summary: BackendCostComparisonSummary;
}

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
  maxGas: number;
  blobCount: number;
  utilizationPct: number;
}

export interface L2UsageDataPoint {
  timestamp: number;
  label: string;
  total: number;
  [seriesKey: string]: string | number;
}

export interface L2UsageSeries {
  key: string;
  name: string;
  category: string;
  address?: string;
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

export type Granularity = 'block' | 'minute' | 'hour' | 'day';

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
  /** Blocks indexed within the window. Absent on older backends. */
  totalBlocks?: number;
  /** Blocks in the window with blob gas usage above target. Absent on older backends. */
  blocksAboveTarget?: number;
}

export interface ChartDataset {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
  l2Usage: L2UsageDataPoint[];
  l2UsageSeries: L2UsageSeries[];
  costComparison: CostComparisonDataPoint[];
  rollingWindows: RollingWindowDataPoint[];
  selectedWindow: RollingWindowDataPoint | null;
  indicators: FeeMarketIndicators;
  granularity: Granularity;
  recentBlockCount: number;
  chartRangeLabel: string;
  coverageLabel: string;
  rollingCoverageLabel: string;
  blockCoverageLabel: string;
}
