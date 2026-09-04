import type { Block } from '@/types';
import { formatGwei } from '@/utils';
import { summarizeBlockTips } from './blockTips';

/** A tip this many times the median marks the market as contested. */
export const CONTESTED_TIP_MULTIPLE = 3;
/** Fewer priced blobs than this and one outlier is not a market signal. */
export const CONTESTED_TIP_MIN_BLOBS = 5;

export interface RecentTipSummary {
  /** Blocks that carried at least one blob with a recorded tip. */
  blockCount: number;
  pricedBlobs: number;
  medianGwei: number | null;
  topGwei: number | null;
  topAttribution: string | null;
  topBlockNumber: number | null;
  /** How many times the median the top tip is; null without a positive median. */
  topMultiple: number | null;
  /**
   * True when one sender is paying far above the market for blob slots,
   * which is when tips, not the base fee, decide whose blobs get in.
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
  let top: { gwei: number; attribution: string; blockNumber: number } | null = null;

  for (const block of blocks) {
    const summary = summarizeBlockTips(block.blobs);
    if (summary.pricedBlobs === 0) continue;
    blockCount += 1;
    for (const tx of summary.transactions) {
      if (tx.priorityFeeGwei === null) continue;
      for (let i = 0; i < tx.blobCount; i++) fees.push(tx.priorityFeeGwei);
      if (top === null || tx.priorityFeeGwei > top.gwei) {
        top = { gwei: tx.priorityFeeGwei, attribution: tx.attribution, blockNumber: Number(block.number) };
      }
    }
  }

  const medianGwei = median(fees);
  const topMultiple =
    top !== null && medianGwei !== null && medianGwei > 0 ? top.gwei / medianGwei : null;

  return {
    blockCount,
    pricedBlobs: fees.length,
    medianGwei,
    topGwei: top?.gwei ?? null,
    topAttribution: top?.attribution ?? null,
    topBlockNumber: top?.blockNumber ?? null,
    topMultiple,
    contested:
      topMultiple !== null &&
      topMultiple >= CONTESTED_TIP_MULTIPLE &&
      fees.length >= CONTESTED_TIP_MIN_BLOBS,
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
  if (summary.contested && summary.topMultiple !== null) {
    return {
      value: formatGwei(summary.topGwei, 4),
      hint: `${bidder} · ${formatMultiple(summary.topMultiple)} the median`,
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
