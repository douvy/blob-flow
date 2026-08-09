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
  /** Including block; null while the transaction is pending. */
  block_number: number | null;
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
  /** Beacon slot of the including block. Omitted for pending blobs and for networks without a configured beacon genesis. */
  slot?: number;
  /** This blob's own EIP-4844 versioned hash (0x01-prefixed). Omitted for rows indexed before versioned hashes were stored. */
  versioned_hash?: string;
  /** All versioned hashes carried by this blob's transaction. Omitted for rows indexed before versioned hashes were stored. */
  versioned_hashes?: string[];
}

/**
 * One blob transaction, assembled for the transaction detail page: every blob
 * row the indexer holds for a tx hash, plus the row that carries the fields
 * they all share (sender, fees, including block, timestamp).
 */
export interface BlobTransaction {
  txHash: string;
  /** Blob rows for this transaction, ordered by blob index. Never empty. */
  blobs: BlobResponse[];
  /** Row the transaction-level fields are read from. */
  primary: BlobResponse;
  /** Including block, or null while the transaction is still pending. */
  blockNumber: number | null;
  confirmed: boolean;
  /**
   * Whether `blobs` holds every blob the transaction carries. False when only
   * part of the transaction could be assembled (pending rows, or a block
   * lookup that failed), so totals derived from `blobs` are lower bounds.
   */
  blobsComplete: boolean;
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

// The indexer attaches pricing to every new_block broadcast and every
// block_snapshot entry; a partial event is never sent, so live consumers can
// rely on capacity data being present.
export interface NewBlockData {
  block_number: number;
  blob_count: number;
  timestamp: string;
  blobs: BlobResponse[];
  pricing: BackendBlobPricingRecentBlock;
}

// transformNewBlockData is also reused to rebuild blocks from REST blob
// feeds, which carry no pricing payload; this looser shape keeps that path
// typed without weakening the wire guarantee above.
export type NewBlockInput = Omit<NewBlockData, 'pricing'> & {
  pricing?: BackendBlobPricingRecentBlock;
};

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

/**
 * One entry from the mempool feed, transformed for display.
 *
 * Despite the name, an entry is a single pending blob rather than a whole
 * transaction: a multi-blob transaction arrives as several entries sharing a
 * tx hash, each carrying its own blob's size and cost. Roll them up with
 * `groupMempoolByTransaction` before showing transaction-level figures.
 */
export interface MempoolTransaction {
  id: number;
  txHash: string;
  transactionUrl?: string;
  fromAddress: string;
  fromAddressFull: string;
  fromAddressUrl?: string;
  user: string | null;
  /**
   * Blobs this entry accounts for, which every payload the indexer sends
   * makes exactly one. The transaction's blob count comes from its versioned
   * hash list, not from here.
   */
  blobCount: number;
  /** This entry's own blob. */
  blobSizeBytes: number;
  baseFeeGwei: string;
  tipGwei: string;
  maxFeeGwei: string;
  feeHeadroom: string;
  /** This entry's own blob, so a transaction's cost is the sum of its entries'. */
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
  /** Raw wei value, kept unformatted for BigInt fee comparisons. */
  currentBaseFeeWei: string;
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
  /** False when the backend had no attribution and name is a truncated address. */
  attributed: boolean;
  dataCount: number;
  percentage: number;
  totalCostEth: string;
  totalCostWei?: string;
  lastTimestamp: string;
}

// Top users response (frontend-shaped)
export interface TopUsersResponse {
  data: User[];
  // True when every row's percentage is the server share of all blobs in the
  // window; false when it is the local fallback share of just the returned
  // rows. Consumers labeling the number must not claim "of total" for the
  // fallback denominator.
  hasServerShares?: boolean;
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
export interface BackfillStatus {
  active: boolean;
  start_block: number;
  current_block: number;
  target_block: number;
  remaining_blocks: number;
  progress_percent: number;
  updated_at: string;
  completed_at?: string;
}

export interface StatusResponse {
  chain_id: number;
  network_name: string;
  last_indexed_block: number;
  indexer_version: string;
  uptime: string;
  /** Timestamp of the last indexed block. */
  last_indexed_time: string;
  /** Absent on older backends. */
  current_chain_head?: number;
  /** Absent on older backends. */
  earliest_indexed_block?: number;
  /** Absent on older backends. */
  latest_indexed_block?: number;
  indexer_lag_blocks?: number;
  last_indexed_at?: string;
  chain_head_updated_at?: string;
  websocket_freshness_at?: string;
  backfill?: BackfillStatus;
}

// Backend network entry - matches an item from GET /networks.
// Carries per-network indexer status; the selector only needs chain_id + name.
export interface BackendNetwork {
  chain_id: number;
  /** Lowercase network identifier used as the `network` query param (e.g. "mainnet"). */
  name: string;
  // Optional presentation fields. The backend does not send these yet; when it
  // starts to, the selector picks them up automatically (see useNetwork's
  // transform). Add further optional fields here and thread them the same way.
  /** Human-friendly label. Falls back to a title-cased `name` when absent. */
  display_name?: string;
  /** Network logo (URL or public path). No icon is shown when absent. */
  icon?: string;
  last_indexed_block?: number;
  current_chain_head?: number;
  indexer_lag_blocks?: number;
  last_indexed_at?: string;
  chain_head_updated_at?: string;
  websocket_freshness_at?: string;
}

// Frontend network option (transformed for the header selector).
export interface Network {
  /** Display label, e.g. "Mainnet". */
  name: string;
  /** Value sent as the `network` query param, e.g. "mainnet". */
  apiParam: string;
  /** Optional logo. Absent until the backend supplies one via GET /networks. */
  icon?: string;
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

export interface BlobUsageDataPoint {
  timestamp: number;
  label: string;
  total: number;
  [seriesKey: string]: string | number;
}

export interface BlobUsageSeries {
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
  blobUsage: BlobUsageDataPoint[];
  blobUsageSeries: BlobUsageSeries[];
  costComparison: CostComparisonDataPoint[];
  rollingWindows: RollingWindowDataPoint[];
  selectedWindow: RollingWindowDataPoint | null;
  indicators: FeeMarketIndicators;
  granularity: Granularity;
  recentBlockCount: number;
  chartRangeLabel: string;
  coverageLabel: string;
  rollingCoverageLabel: string;
  /** Coverage caption for the fee and utilization charts (blob-market buckets). */
  blockCoverageLabel: string;
  /** Coverage caption for the blob usage chart (attribution-usage buckets). */
  blobUsageCoverageLabel: string;
  /** Coverage caption for the cost savings chart (cost-comparison buckets). */
  costComparisonCoverageLabel: string;
}

// ---- Blob market records ----
//
// The backend has no dedicated records endpoint yet, so these shapes are
// derived client-side from the pricing, rolling-window, stats, and
// attribution endpoints (see src/lib/records.ts). When a /records endpoint
// ships, its response should be mapped onto BlobRecords so the page and
// components below it stay unchanged.

// Backend historical records response. Matches GET /records in
// blob-indexer-api (a-thomas-22/blob-indexer-api PR 316).
export interface BackendBlobStreakRun {
  length: number;
  start_block: number;
  end_block: number;
  start_timestamp: string;
  end_timestamp: string;
}

export interface BackendBlobStreakBoard {
  /** Run ending at the last indexed block; null when that block does not qualify. */
  current: BackendBlobStreakRun | null;
  /** Longest runs, sorted by length desc, then end_block desc. */
  top: BackendBlobStreakRun[];
}

export interface BackendBlobFeePeak {
  block_number: number;
  timestamp: string;
  blob_base_fee: string;
  blob_base_fee_gwei: string;
  blob_count: number;
}

export interface BackendBusiestHour {
  /** Start of the UTC hour bucket, ISO-8601. */
  hour_start: string;
  blob_count: number;
  total_cost_wei: string;
}

export interface BackendBusiestDay {
  /** Start of the UTC day bucket, ISO-8601. */
  day_start: string;
  blob_count: number;
  total_cost_wei: string;
}

export interface BackendUtilizationDay {
  day_start: string;
  /** Mean per-block blob utilization over the day. */
  average_utilization_percent: number;
  block_count: number;
  blob_count: number;
  blocks_at_max: number;
  blocks_above_target: number;
}

export interface BackendExpensiveBlock {
  block_number: number;
  timestamp: string;
  blob_count: number;
  blob_base_fee: string;
  blob_base_fee_gwei: string;
  /** The block's total blob spend in wei. */
  total_cost_wei: string;
}

export interface BackendRecordTopSpender {
  address: string;
  /** Known rollup name; absent when the address is unattributed. */
  user_attribution?: string;
  blob_count: number;
  total_cost_wei: string;
}

export interface BackendBlobRecordsResponse {
  network_id: number;
  network_name: string;
  generated_at: string;
  /** Streaks of consecutive blocks that used every available blob slot. */
  full_block_streaks: BackendBlobStreakBoard;
  /** Streaks of consecutive blocks with blob gas usage above target. */
  above_target_streaks: BackendBlobStreakBoard;
  /** Streaks of consecutive blocks carrying no blobs at all. */
  drought_streaks: BackendBlobStreakBoard;
  /** Streaks of consecutive blocks strictly below the blob gas target. */
  below_target_streaks: BackendBlobStreakBoard;
  /** Highest blob base fee blocks ever indexed, highest first. */
  base_fee_peaks: BackendBlobFeePeak[];
  /** Blocks that burned the most on blob fees, priciest first. */
  most_expensive_blocks: BackendExpensiveBlock[];
  /** Busiest UTC hours by blob count ever indexed, busiest first. */
  busiest_hours: BackendBusiestHour[];
  /** Busiest UTC days by blob count ever indexed, busiest first. */
  busiest_days: BackendBusiestDay[];
  /** UTC days with the highest mean blob utilization, highest first. */
  highest_utilization_days: BackendUtilizationDay[];
  /** Largest all-history blob spenders by address. */
  top_spenders: BackendRecordTopSpender[];
}

/** One historical streak run (frontend shape). */
export interface StreakRun {
  length: number;
  startBlock: number;
  endBlock: number;
  endTimestamp: string;
}

/** Historical streak leaderboard for one streak kind. */
export interface StreakLeaderboard {
  /** Run ending at the last indexed block; null when the tip does not qualify. */
  current: StreakRun | null;
  /** Longest runs, best first. */
  top: StreakRun[];
}

/** One all-time base fee peak (frontend shape). */
export interface FeePeak {
  blockNumber: number;
  timestamp: string;
  feeGwei: number;
  blobCount: number;
}

/** One all-time priciest block by total blob spend (frontend shape). */
export interface ExpensiveBlock {
  blockNumber: number;
  timestamp: string;
  totalCostWei: string;
  blobCount: number;
}

/** One all-time busiest UTC hour (frontend shape). */
export interface BusiestHour {
  hourStart: string;
  blobCount: number;
  totalCostWei: string;
}

/** One all-time busiest UTC day (frontend shape). */
export interface BusiestDay {
  dayStart: string;
  blobCount: number;
  totalCostWei: string;
}

/** One all-time highest mean utilization UTC day (frontend shape). */
export interface UtilizationDay {
  dayStart: string;
  averageUtilizationPercent: number;
  blockCount: number;
  blobCount: number;
}

/** One attributed entity in the spend ranking. */
export interface SpenderRecord {
  key: string;
  name: string;
  category: string;
  totalCostWei: string;
  spendSharePercent: number;
  blobCount: number;
}

/** Progress of one attributed entity toward its next round blob-count milestone. */
export interface RollupMilestone {
  key: string;
  name: string;
  category: string;
  blobCount: number;
  blobSharePercent: number;
  nextMilestone: number;
  remainingToMilestone: number;
  /** Percent of the way from zero to nextMilestone, in [0, 100). */
  progressPercent: number;
}

export interface AllTimeTotalsRecord {
  totalBlobs: number;
  averageBaseFee: string;
}

/**
 * All records shown on /records. The leaderboard sections come from GET
 * /records; the spend ranking and milestones from all-time attribution
 * shares; the totals from /stats. A section that is empty (a board with no
 * runs, an empty list) simply renders no card.
 */
export interface BlobRecords {
  fullBlockStreaks: StreakLeaderboard;
  aboveTargetStreaks: StreakLeaderboard;
  belowTargetStreaks: StreakLeaderboard;
  feePeaks: FeePeak[];
  expensiveBlocks: ExpensiveBlock[];
  busiestHours: BusiestHour[];
  busiestDays: BusiestDay[];
  /**
   * UTC days ranked by total blob spend, derived from the all-time
   * attribution day buckets rather than GET /records.
   */
  priciestDays: BusiestDay[];
  utilizationDays: UtilizationDay[];
  /** Attributed entities ranked by total blob spend, biggest first. */
  topSpenders: SpenderRecord[];
  allTime: AllTimeTotalsRecord;
  milestones: RollupMilestone[];
}

// ---- Search ----

/** A navigable destination parsed from a search query. */
export type SearchTarget =
  | { kind: 'block'; blockNumber: string }
  | { kind: 'address'; address: string }
  | { kind: 'transaction'; txHash: string }
  | { kind: 'blob'; versionedHash: string };

// Backend SearchMatchResponse - matches api.SearchMatchResponse from swagger.
// `type` discriminates which of the remaining fields are populated;
// block_number is omitted on matches still pending in the mempool.
export interface SearchMatchResponse {
  type: 'block' | 'transaction' | 'blob' | 'address' | 'rollup';
  block_number?: number;
  tx_hash?: string;
  versioned_hash?: string;
  address?: string;
  user_attribution?: string;
  name?: string;
  addresses?: string[];
}

// ---- Rollup head-to-head comparison (/vs/[a]/[b]) ----

/** How a comparison row's raw values should be rendered. */
export type VsMetricFormat = 'count' | 'percent' | 'eth' | 'cost';

/** Which side of the matchup a row or the overall result favors. */
export type VsWinner = 'a' | 'b' | 'tie';

/**
 * One metric row of the battle card. Raw values are numeric strings: plain
 * numbers for count/percent formats, integer wei for eth/cost formats, so
 * they survive serialization and BigInt comparison without precision loss.
 *
 * `detail` carries a metric that is fully derived from the primary one
 * (blob share from blob count, spend share from ETH spent, per-blob cost
 * from per-MB cost) and therefore always shares its winner; it is shown as
 * context but never scored as a separate contest.
 */
export interface VsComparisonRow {
  key: string;
  label: string;
  format: VsMetricFormat;
  /** Whether a higher or a lower value wins this row. */
  betterDirection: 'higher' | 'lower';
  a: string;
  b: string;
  winner: VsWinner;
  detail?: {
    format: VsMetricFormat;
    /** Short suffix rendered after the value, e.g. "share" or "per blob". */
    label: string;
    a: string;
    b: string;
  };
}

/** Full matchup result: per-metric rows plus the overall verdict. */
export interface VsComparison {
  rows: VsComparisonRow[];
  rowWins: { a: number; b: number };
  overall: VsWinner;
}
