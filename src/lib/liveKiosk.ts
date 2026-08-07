import { parseGwei } from './blobFeeHero';
import type { MempoolAttributionSummary } from './mempoolAttribution';
import type {
  Block,
  BlobPricingRecentBlock,
  BlobWebSocketConnectionState,
  User,
} from '../types';

/**
 * Blocks requested from /blob/pricing and kept in the live merge. 300 blocks
 * is about an hour at one block per 12s, which is what the trend chart
 * advertises; the ticker takes its slots off the top of the same list.
 */
export const KIOSK_PRICING_BLOCKS = 300;

/** Slots in the block ticker. Fixed so the row never reflows as blocks land. */
export const KIOSK_TICKER_BLOCKS = 10;

/** Rollups listed in the share panel. */
export const KIOSK_TOP_ROLLUPS = 5;

/**
 * Rows requested for the share panel. Deeper than KIOSK_TOP_ROLLUPS because
 * unattributed senders are dropped before the top rollups are taken: a panel
 * titled "top rollups" must not list a raw address.
 */
export const KIOSK_ROLLUP_FETCH = 20;

/** How long the full-block celebration stays on screen. */
export const KIOSK_CELEBRATION_MS = 4500;

/** Idle time after which the kiosk controls fade out. */
export const KIOSK_CONTROL_IDLE_MS = 4000;

/** Query param selecting a single rollup to focus the kiosk on. */
export const KIOSK_FOCUS_PARAM = 'focus';

/** Rollups offered in the focus picker (24h window, so quiet L2s stay listed). */
export const KIOSK_FOCUS_OPTIONS = 10;

/**
 * Relative fee moves below this are shown as flat. Blob base fees drift by
 * fractions of a percent between blocks, and an arrow that flips every 12
 * seconds reads as noise from across a room.
 */
const FLAT_THRESHOLD_RATIO = 0.005;

export type KioskFeeDirection = 'up' | 'down' | 'flat';

/**
 * Direction of a fee move, treating changes under FLAT_THRESHOLD_RATIO as
 * flat. Returns 'flat' when either side is missing or non-positive, since a
 * zero baseline gives no meaningful direction.
 */
export function getFeeDirection(
  currentGwei: number,
  previousGwei: number | null | undefined
): KioskFeeDirection {
  if (
    previousGwei === null ||
    previousGwei === undefined ||
    !Number.isFinite(previousGwei) ||
    !Number.isFinite(currentGwei) ||
    previousGwei <= 0 ||
    currentGwei <= 0
  ) {
    return 'flat';
  }

  const ratio = (currentGwei - previousGwei) / previousGwei;
  if (ratio > FLAT_THRESHOLD_RATIO) return 'up';
  if (ratio < -FLAT_THRESHOLD_RATIO) return 'down';
  return 'flat';
}

/**
 * Direction of the next-block prediction. The numeric comparison against the
 * current fee is authoritative because it is what the readout shows; the
 * backend's `predicted_direction` is the fallback when either fee is missing.
 */
export function getPredictedDirection(
  predictedGwei: number,
  currentGwei: number,
  backendDirection?: string
): KioskFeeDirection {
  if (predictedGwei > 0 && currentGwei > 0) {
    return getFeeDirection(predictedGwei, currentGwei);
  }

  const normalized = backendDirection?.toLowerCase();
  if (normalized === 'up' || normalized === 'increasing') return 'up';
  if (normalized === 'down' || normalized === 'decreasing') return 'down';
  return 'flat';
}

export interface KioskChartPoint {
  blockNumber: number;
  fee: number;
}

/**
 * Per-block fee points for the trend chart, oldest first (blocks arrive
 * newest first). Fees parse through the same path as the headline readout,
 * so the right edge of the curve always matches the big number above it.
 *
 * Non-positive fees are dropped rather than plotted: a malformed record
 * parses to 0 and would draw a plunge to the axis that contradicts the
 * low/avg/high caption, which skips those same records.
 */
export function buildChartPoints(blocks: BlobPricingRecentBlock[]): KioskChartPoint[] {
  return blocks
    .slice()
    .reverse()
    .map((block) => ({
      blockNumber: block.blockNumber,
      fee: parseGwei(block.blobBaseFeeGwei),
    }))
    .filter((point) => point.fee > 0);
}

export interface KioskFeeExtremes {
  lowGwei: number;
  highGwei: number;
  /** Mean of the plotted fees, drawn as the chart's reference line. */
  averageGwei: number;
}

/**
 * Range of the plotted window. Zero fees are skipped (they only appear when
 * a payload is malformed and would fake a floor of 0); null when nothing is
 * plottable, so callers drop the caption instead of printing zeros.
 */
export function getFeeExtremes(points: KioskChartPoint[]): KioskFeeExtremes | null {
  const fees = points.map((point) => point.fee).filter((fee) => fee > 0);
  if (fees.length === 0) return null;

  return {
    lowGwei: Math.min(...fees),
    highGwei: Math.max(...fees),
    averageGwei: fees.reduce((sum, fee) => sum + fee, 0) / fees.length,
  };
}

export interface KioskFullness {
  /** Clamped to 0-100 so a malformed payload cannot overflow the gauge. */
  percent: number;
  blobCount: number;
  maxBlobs: number;
  isFull: boolean;
  isAboveTarget: boolean;
}

const EMPTY_FULLNESS: KioskFullness = {
  percent: 0,
  blobCount: 0,
  maxBlobs: 0,
  isFull: false,
  isAboveTarget: false,
};

/** Blobspace fullness of the newest block, or an empty gauge before one lands. */
export function getFullness(block: BlobPricingRecentBlock | undefined): KioskFullness {
  if (!block) return EMPTY_FULLNESS;

  return {
    percent: clampPercent(block.utilizationPercent),
    blobCount: block.blobCount,
    maxBlobs: block.maxBlobs,
    isFull: block.isFull,
    isAboveTarget: block.isAboveTarget,
  };
}

export interface KioskTickerFocus {
  /**
   * The focused rollup's blobs in this block. Null when the block's blob
   * details are missing (a count without records), where 0 would wrongly
   * read as "posted nothing".
   */
  count: number | null;
  /** The focused rollup's share of the block's capacity, for the overlay bar. */
  percent: number;
}

export interface KioskTickerBlock {
  kind: 'block';
  key: string;
  blockNumber: number;
  blobCount: number;
  maxBlobs: number;
  fillPercent: number;
  feeGwei: number;
  isFull: boolean;
  isAboveTarget: boolean;
  /** Present only in focus mode. */
  focus?: KioskTickerFocus;
}

export interface KioskTickerPlaceholder {
  kind: 'placeholder';
  key: string;
}

export type KioskTickerSlot = KioskTickerBlock | KioskTickerPlaceholder;

/**
 * Exactly `limit` ticker slots, newest first, padded with placeholders while
 * the feed is still filling. A fixed slot count keeps every card the same
 * width from the first paint, so arriving blocks never resize the row.
 */
export function buildTickerSlots(
  blocks: BlobPricingRecentBlock[],
  limit = KIOSK_TICKER_BLOCKS
): KioskTickerSlot[] {
  const slots: KioskTickerSlot[] = blocks.slice(0, limit).map((block) => ({
    kind: 'block',
    key: block.blockNumber.toString(),
    blockNumber: block.blockNumber,
    blobCount: block.blobCount,
    maxBlobs: block.maxBlobs,
    fillPercent: clampPercent(block.utilizationPercent),
    feeGwei: parseGwei(block.blobBaseFeeGwei),
    isFull: block.isFull,
    isAboveTarget: block.isAboveTarget,
  }));

  return padTickerSlots(slots, limit);
}

/**
 * Ticker slots for focus mode, built from full block records (the pricing
 * feed carries no attribution). Blocks arrive newest first, same as the
 * pricing feed, and the row is padded to `limit` for the same
 * no-reflow guarantee as buildTickerSlots.
 */
export function buildFocusTickerSlots(
  blocks: Block[],
  focus: string,
  limit = KIOSK_TICKER_BLOCKS
): KioskTickerSlot[] {
  const slots: KioskTickerSlot[] = blocks.slice(0, limit).map((block) => {
    const focusCount =
      block.blobs.length === 0 && block.blobCount > 0
        ? null
        : block.blobs.filter((blob) => blob.user_attribution === focus).length;

    return {
      kind: 'block',
      key: block.number,
      blockNumber: Number(block.number),
      blobCount: block.blobCount,
      maxBlobs: block.maxBlobs,
      fillPercent: clampPercent(block.utilizationPercent),
      feeGwei: parseGwei(block.baseFeeGwei),
      isFull: block.isFull,
      isAboveTarget: block.isAboveTarget,
      focus: {
        count: focusCount,
        percent:
          focusCount !== null && focusCount > 0 && block.maxBlobs > 0
            ? clampPercent((focusCount / block.maxBlobs) * 100)
            : 0,
      },
    };
  });

  return padTickerSlots(slots, limit);
}

function padTickerSlots(slots: KioskTickerSlot[], limit: number): KioskTickerSlot[] {
  while (slots.length < limit) {
    slots.push({ kind: 'placeholder', key: `placeholder-${slots.length}` });
  }
  return slots;
}

export interface KioskRollup {
  name: string;
  /**
   * Share of all blobs in the window. Null when the backend did not supply
   * server-side shares, since the local fallback is only a share of the
   * returned rows and must not be presented as a share of the hour.
   */
  sharePercent: number | null;
  blobCount: number;
  /** Blobs rescaled against the leader, so the top bar always fills the track. */
  barPercent: number;
  /** True for the rollup the kiosk is focused on. */
  isFocused: boolean;
}

/**
 * Top rollups sized against the leading rollup rather than against 100, so the
 * bars stay readable from a distance when no single rollup dominates.
 *
 * Unattributed senders are dropped: they arrive as truncated addresses, and a
 * panel headed "top rollups" listing `0x12…34` misnames what it is showing.
 * Pass more rows than `limit` (see KIOSK_ROLLUP_FETCH) so the filtering does
 * not thin the list.
 */
export function buildRollupBars(
  users: User[] | undefined,
  limit = KIOSK_TOP_ROLLUPS,
  focus: string | null = null,
  hasServerShares = true
): KioskRollup[] {
  const rows = (users ?? []).filter((user) => user.attributed).slice(0, limit);
  // Normalized on blob counts rather than percentages: counts are always
  // present and carry the same proportions as server shares.
  const leadCount = rows.reduce((max, user) => Math.max(max, user.dataCount), 0);

  return rows.map((user) => ({
    name: user.name,
    sharePercent: hasServerShares ? user.percentage : null,
    blobCount: user.dataCount,
    barPercent: leadCount > 0 ? clampPercent((user.dataCount / leadCount) * 100) : 0,
    isFocused: focus !== null && user.name === focus,
  }));
}

/** Sender groups shown as icons in the mempool panel. */
export const KIOSK_MEMPOOL_GROUPS = 4;

export interface KioskMempoolGroup {
  name: string;
  blobCount: number;
}

export interface KioskMempool {
  /** Pending blobs in the sample, rendered with a "+" when the sample is capped. */
  pendingLabel: string;
  /** Blobs whose fee cap clears the current base fee, null while the fee is unknown. */
  includableLabel: string;
  /** Blocks the priced-in backlog would take to drain, null when not computable. */
  blocksToClearLabel: string | null;
  senderCount: number;
  /** Largest pending senders, ordered by blob count, capped for the icon row. */
  groups: KioskMempoolGroup[];
  isEmpty: boolean;
}

/**
 * Pending blob demand for the kiosk panel.
 *
 * Returns null until a mempool sample has loaded, so the panel can hold its
 * shape rather than flashing zeros. A capped sample marks every count as a
 * lower bound: the public mempool is already an undercount, and rounding a
 * truncated sample into a bare number would overstate its authority.
 */
export function summarizeKioskMempool(
  summary: MempoolAttributionSummary | null,
  likelyIncludable: number | null,
  isTruncated: boolean,
  maxBlobs: number
): KioskMempool | null {
  if (!summary) return null;

  const more = isTruncated ? '+' : '';
  // With nothing priced in there is no backlog to drain; "0 blocks to clear"
  // would just be noise under an empty panel.
  const blocksToClear =
    likelyIncludable !== null && likelyIncludable > 0 && maxBlobs > 0
      ? Math.ceil(likelyIncludable / maxBlobs)
      : null;

  return {
    pendingLabel: `${summary.blobCount.toLocaleString()}${more}`,
    includableLabel:
      likelyIncludable === null
        ? 'pricing pending'
        : `${likelyIncludable.toLocaleString()}${more} priced in`,
    blocksToClearLabel:
      blocksToClear === null
        ? null
        : `${blocksToClear.toLocaleString()}${more} block${blocksToClear === 1 && !more ? '' : 's'} to clear`,
    senderCount: summary.uniqueSenderCount,
    // Groups arrive sorted by blob count from aggregateMempoolAttribution.
    groups: summary.groups.slice(0, KIOSK_MEMPOOL_GROUPS).map((group) => ({
      name: group.user,
      blobCount: group.blobCount,
    })),
    isEmpty: summary.blobCount === 0,
  };
}

export interface KioskConnectionStatus {
  label: string;
  dotClass: string;
  textClass: string;
  /** True when the stream is not delivering blocks, so the view is frozen. */
  isDegraded: boolean;
}

const CONNECTION_STATUSES: Record<BlobWebSocketConnectionState, KioskConnectionStatus> = {
  connected: {
    label: 'Live',
    dotClass: 'bg-green',
    textClass: 'text-green',
    isDegraded: false,
  },
  connecting: {
    label: 'Connecting',
    dotClass: 'bg-yellow-400',
    textClass: 'text-yellow-400',
    isDegraded: true,
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass: 'bg-yellow-400',
    textClass: 'text-yellow-400',
    isDegraded: true,
  },
  stale: {
    label: 'Stream stalled',
    dotClass: 'bg-yellow-400',
    textClass: 'text-yellow-400',
    isDegraded: true,
  },
  disconnected: {
    label: 'Offline',
    dotClass: 'bg-red',
    textClass: 'text-red',
    isDegraded: true,
  },
};

/** Presentation for a websocket connection state on the kiosk status strip. */
export function describeKioskConnection(
  state: BlobWebSocketConnectionState
): KioskConnectionStatus {
  return CONNECTION_STATUSES[state] ?? CONNECTION_STATUSES.connecting;
}

/**
 * Seconds since the newest block, or null when there is no block yet or the
 * timestamp is unparseable. Negative ages (clock skew between the indexer and
 * the display) are reported as 0 rather than as a block from the future.
 */
export function getBlockAgeSeconds(
  blockTimestamp: string | undefined,
  nowMs: number
): number | null {
  if (!blockTimestamp) return null;

  const blockMs = new Date(blockTimestamp).getTime();
  if (Number.isNaN(blockMs)) return null;

  return Math.max(0, Math.round((nowMs - blockMs) / 1000));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
