import type { Block } from '@/types';
import { formatGwei } from '@/utils';
import { summarizeBlockTips } from './blockTips';

/** A tip this many times the median marks the market as contested. */
export const CONTESTED_TIP_MULTIPLE = 3;
/** Fewer independent bids (priced transactions) than this and one outlier is not a market signal. */
export const CONTESTED_TIP_MIN_BIDS = 5;

export interface RecentTipSummary {
  /** Blocks that carried at least one blob with a recorded tip. */
  blockCount: number;
  /** Of those, blocks whose blob slots were all taken: outbidding only matters when there is nothing left over. */
  fullBlocks: number;
  pricedBlobs: number;
  /** Priced transactions, each an independent bid. */
  bids: number;
  medianGwei: number | null;
  topGwei: number | null;
  topAttribution: string | null;
  topBlockNumber: number | null;
  /** How many times the median the top tip is; null without a positive median. */
  topMultiple: number | null;
  /**
   * True when one sender is paying far above the market for blob slots in
   * blocks that were actually full, which is when tips rather than the base
   * fee decide whose blobs get in. Overpaying into empty blocks is not a
   * crowd-out, so a sample without a full block never qualifies.
   */
  contested: boolean;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * The tip picture across the newest blocks: the highest priority fee any
 * blob transaction paid, who paid it, and how far above the blob-weighted
 * median it sits. Blocks indexed before tips were stored contribute nothing.
 */
export function summarizeRecentTips(blocks: Block[]): RecentTipSummary {
  const fees: number[] = [];
  let blockCount = 0;
  let fullBlocks = 0;
  let bids = 0;
  let top: { gwei: number; attribution: string; blockNumber: number } | null = null;

  for (const block of blocks) {
    const summary = summarizeBlockTips(block.blobs);
    if (summary.pricedBlobs === 0) continue;
    blockCount += 1;
    if (block.isFull) fullBlocks += 1;
    for (const tx of summary.transactions) {
      if (tx.priorityFeeGwei === null) continue;
      bids += 1;
      for (let i = 0; i < tx.pricedBlobCount; i++) fees.push(tx.priorityFeeGwei);
      if (top === null || tx.priorityFeeGwei > top.gwei) {
        top = { gwei: tx.priorityFeeGwei, attribution: tx.attribution, blockNumber: Number(block.number) };
      }
    }
  }

  const medianGwei = median(fees);
  const topMultiple =
    top !== null && medianGwei !== null && medianGwei > 0 ? top.gwei / medianGwei : null;
  // A positive bid over a zero median has no finite multiple but is the
  // starkest form of outbidding: everyone else paid nothing.
  const outbid =
    topMultiple !== null
      ? topMultiple >= CONTESTED_TIP_MULTIPLE
      : top !== null && medianGwei === 0 && top.gwei > 0;

  return {
    blockCount,
    fullBlocks,
    pricedBlobs: fees.length,
    bids,
    medianGwei,
    topGwei: top?.gwei ?? null,
    topAttribution: top?.attribution ?? null,
    topBlockNumber: top?.blockNumber ?? null,
    topMultiple,
    contested: outbid && bids >= CONTESTED_TIP_MIN_BIDS && fullBlocks > 0,
  };
}

/**
 * Copy for the Top tip tile. The value is the highest priority fee paid in
 * the sampled blocks; the hint names the bidder and, once one sender is
 * paying several times the market, how far above the median it went.
 */
export function describeTopTip(summary: RecentTipSummary): {
  value: string;
  hint: string;
  alert: boolean;
} {
  if (summary.topGwei === null) {
    return { value: '-', hint: 'no tips recorded yet', alert: false };
  }
  const bidder = summary.topAttribution ?? 'Unknown';
  if (summary.contested) {
    return {
      value: formatGwei(summary.topGwei, 4),
      hint:
        summary.topMultiple !== null
          ? `${bidder} · ${formatMultiple(summary.topMultiple)} the median`
          : `${bidder} · others paid no tip`,
      alert: true,
    };
  }
  return {
    value: formatGwei(summary.topGwei, 4),
    hint: `${bidder} · last ${summary.blockCount.toLocaleString()} ${summary.blockCount === 1 ? 'block' : 'blocks'}`,
    alert: false,
  };
}

function formatMultiple(multiple: number): string {
  const rounded = multiple >= 10 ? Math.round(multiple) : Math.round(multiple * 10) / 10;
  return `${rounded.toLocaleString()}x`;
}
