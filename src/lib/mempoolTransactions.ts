import type { MempoolTransaction } from '@/types';
import { costToWei, formatBlobWeiCost } from '@/utils';

/**
 * One pending transaction, assembled from the mempool feed's per-blob entries.
 *
 * Every entry describes a single blob: its own size, its own share of the
 * cost, and a blob gas figure that is always one blob's worth. Reading a blob
 * count off one entry therefore always yields 1, which is why the count comes
 * from the transaction's versioned hash list and the totals are summed across
 * the entries in hand.
 */
export interface PendingMempoolTransaction {
  txHash: string;
  transactionUrl?: string;
  /** Truncated for display; `fromAddressFull` carries the whole address. */
  fromAddress: string;
  fromAddressFull: string;
  fromAddressUrl?: string;
  user: string | null;
  /**
   * Blobs the transaction carries. The versioned hash list covers the whole
   * transaction, so this stays right even when the sample holds only some of
   * its entries.
   */
  blobCount: number;
  /**
   * Entries for this transaction in the sample. Below `blobCount` only when
   * the sample limit cut the transaction in half, which makes every summed
   * total below a lower bound.
   */
  sampledBlobCount: number;
  /** Summed over the sampled entries. */
  blobSizeBytes: number;
  /** Per-gas rates, shared by all of the transaction's blobs. */
  baseFeeGwei: string;
  tipGwei: string;
  maxFeeGwei: string;
  feeHeadroom: string;
  /** Summed over the sampled entries; "-" when an entry lacks the field. */
  realizedCost: string;
  maxCost: string;
  /** ISO-8601 first-seen timestamp, the earliest across the entries. */
  timeInMempool: string;
  /** The sampled entries, ordered by blob index. Never empty. */
  entries: MempoolTransaction[];
}

/**
 * Roll the mempool feed's per-blob entries up into the transactions that sent
 * them, preserving the order transactions first appear in the list.
 *
 * Entries are matched on a case-insensitive hash so the same transaction
 * cannot land in two groups when a REST snapshot and a live event disagree on
 * the hash's casing.
 */
export function groupMempoolByTransaction(
  entries: MempoolTransaction[]
): PendingMempoolTransaction[] {
  const entriesByHash = new Map<string, MempoolTransaction[]>();

  entries.forEach((entry) => {
    const key = entry.txHash.toLowerCase();
    const group = entriesByHash.get(key);
    if (group) {
      group.push(entry);
    } else {
      entriesByHash.set(key, [entry]);
    }
  });

  return Array.from(entriesByHash.values()).map(buildPendingTransaction);
}

/**
 * Whether the sample holds only some of a transaction's blobs, which makes
 * every total summed over its entries a lower bound.
 */
export function isPartiallySampled(transaction: PendingMempoolTransaction): boolean {
  return transaction.sampledBlobCount < transaction.blobCount;
}

/**
 * Mark a partial total with the "+" the rest of the mempool UI uses for lower
 * bounds. A value that was never available ("-") passes through, since "-+"
 * would read as a bound on nothing.
 */
export function withLowerBound(value: string, partial: boolean): string {
  return partial && value !== '-' ? `${value}+` : value;
}

function buildPendingTransaction(entries: MempoolTransaction[]): PendingMempoolTransaction {
  const sorted = [...entries].sort(
    (left, right) => left.rawBlob.blob_index - right.rawBlob.blob_index
  );
  const primary = sorted[0];
  // Rows indexed before versioned hashes were stored have no list, leaving the
  // entries in hand as the only evidence of how many blobs there are.
  const declaredBlobCount = primary.rawBlob.versioned_hashes?.length ?? 0;

  return {
    txHash: primary.txHash,
    transactionUrl: primary.transactionUrl,
    fromAddress: primary.fromAddress,
    fromAddressFull: primary.fromAddressFull,
    fromAddressUrl: primary.fromAddressUrl,
    user: primary.user,
    blobCount: Math.max(sorted.length, declaredBlobCount),
    sampledBlobCount: sorted.length,
    blobSizeBytes: sorted.reduce((total, entry) => total + (entry.blobSizeBytes || 0), 0),
    baseFeeGwei: primary.baseFeeGwei,
    tipGwei: primary.tipGwei,
    maxFeeGwei: primary.maxFeeGwei,
    feeHeadroom: primary.feeHeadroom,
    realizedCost: sumCost(
      sorted.map(
        (entry) =>
          entry.rawBlob.realized_cost_wei ??
          entry.rawBlob.total_cost_wei ??
          entry.rawBlob.total_cost_eth
      )
    ),
    maxCost: sumCost(sorted.map((entry) => entry.rawBlob.max_cost_wei)),
    timeInMempool: earliestTimestamp(sorted),
    entries: sorted,
  };
}

/**
 * Total of a cost field across a transaction's blob entries. An entry missing
 * or carrying an unusable value voids the total ("-") rather than yielding an
 * exact-looking undercount.
 */
function sumCost(values: Array<string | undefined>): string {
  let total = BigInt(0);

  for (const value of values) {
    const wei = costToWei(value);
    if (wei === null) return '-';
    total += wei;
  }

  return formatBlobWeiCost(total.toString());
}

/**
 * A transaction's blobs are seen together, so their timestamps normally match.
 * Taking the earliest keeps the displayed age honest if they ever drift, and
 * unparseable timestamps never win over a usable one.
 */
function earliestTimestamp(entries: MempoolTransaction[]): string {
  let earliest = entries[0].timeInMempool;
  let earliestMs = Date.parse(earliest);

  entries.forEach((entry) => {
    const entryMs = Date.parse(entry.timeInMempool);
    if (!Number.isFinite(entryMs)) return;
    if (!Number.isFinite(earliestMs) || entryMs < earliestMs) {
      earliest = entry.timeInMempool;
      earliestMs = entryMs;
    }
  });

  return earliest;
}
