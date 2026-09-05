import type { BlobResponse } from '@/types';

/** One blob transaction in a block and the tip it paid for its blob slots. */
export interface BlockTipTransaction {
  txHash: string;
  attribution: string;
  fromAddress: string;
  blobCount: number;
  /** Blobs of this transaction with a recorded fee; every row of a transaction is written together, so normally 0 or blobCount. */
  pricedBlobCount: number;
  /** Priority fee per execution gas in gwei; null when the indexer did not record it. */
  priorityFeeGwei: number | null;
}

export interface BlockTipSummary {
  totalBlobs: number;
  /** Blobs whose transaction has a recorded priority fee. */
  pricedBlobs: number;
  /** Blob-weighted mean tip across priced blobs; null when none are priced. */
  averageGwei: number | null;
  maxGwei: number | null;
  /** Highest bid first; transactions without a recorded tip last. */
  transactions: BlockTipTransaction[];
}

function parseGwei(gwei?: string, wei?: string): number | null {
  if (gwei !== undefined && gwei !== '') {
    const parsed = Number(gwei);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (wei !== undefined && wei !== '') {
    const parsed = Number(wei);
    return Number.isFinite(parsed) ? parsed / 1e9 : null;
  }
  return null;
}

/**
 * Rolls a block's blob rows up to one entry per transaction, since every
 * blob in a transaction shares its tip, and summarizes what the block's
 * senders paid. Averages weight by blob so a two-blob transaction counts
 * twice, matching the number of slots it bought.
 */
export function summarizeBlockTips(blobs: BlobResponse[]): BlockTipSummary {
  const byTx = new Map<string, BlockTipTransaction>();
  let pricedBlobs = 0;
  let weightedSum = 0;
  let maxGwei: number | null = null;

  for (const blob of blobs) {
    const fee = parseGwei(blob.priority_fee_per_gas_gwei, blob.priority_fee_per_gas);
    const existing = byTx.get(blob.tx_hash);
    if (existing) {
      existing.blobCount += 1;
      if (fee !== null) {
        existing.pricedBlobCount += 1;
        if (existing.priorityFeeGwei === null) existing.priorityFeeGwei = fee;
      }
    } else {
      byTx.set(blob.tx_hash, {
        txHash: blob.tx_hash,
        attribution: blob.user_attribution || 'Unknown',
        fromAddress: blob.from_address,
        blobCount: 1,
        pricedBlobCount: fee === null ? 0 : 1,
        priorityFeeGwei: fee,
      });
    }
    if (fee !== null) {
      pricedBlobs += 1;
      weightedSum += fee;
      maxGwei = maxGwei === null ? fee : Math.max(maxGwei, fee);
    }
  }

  const transactions = [...byTx.values()].sort((a, b) => {
    if (a.priorityFeeGwei === null) return b.priorityFeeGwei === null ? 0 : 1;
    if (b.priorityFeeGwei === null) return -1;
    return b.priorityFeeGwei - a.priorityFeeGwei;
  });

  return {
    totalBlobs: blobs.length,
    pricedBlobs,
    averageGwei: pricedBlobs > 0 ? weightedSum / pricedBlobs : null,
    maxGwei,
    transactions,
  };
}
