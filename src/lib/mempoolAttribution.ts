import { MempoolTransaction } from '@/types';

/**
 * Shown wherever mempool data is displayed: the public mempool is an
 * incomplete view of pending blob demand.
 */
export const MEMPOOL_PRIVATE_CAVEAT =
  'Only the public mempool is visible here. Some providers submit blobs through private channels, so their transactions don’t appear until they’re mined.';

export const UNATTRIBUTED_MEMPOOL_USER = 'Unknown';

export interface MempoolAttributionGroup {
  user: string;
  txCount: number;
  blobCount: number;
  blobSizeBytes: number;
  /**
   * Full sender address for the group, set only when every transaction in it
   * shares one address. Groups that span several addresses (e.g. "Unknown")
   * leave this undefined so the UI does not link to an arbitrary user page.
   */
  address?: string;
}

export interface MempoolAttributionSummary {
  txCount: number;
  blobCount: number;
  blobSizeBytes: number;
  /** Sorted by blob count, then tx count, then name. */
  groups: MempoolAttributionGroup[];
}

/**
 * Roll pending blob entries up by attributed user (L2/provider).
 *
 * The mempool endpoint returns one entry per blob, so a multi-blob
 * transaction arrives as several entries sharing a tx hash: transaction
 * counts dedupe by hash while blob counts and sizes sum per entry.
 */
export function aggregateMempoolAttribution(
  transactions: MempoolTransaction[]
): MempoolAttributionSummary {
  const groupsByUser = new Map<
    string,
    {
      txHashes: Set<string>;
      blobCount: number;
      blobSizeBytes: number;
      // Keyed by lowercased address so mixed checksum/lowercase forms of one
      // sender dedupe to a single entry; the value keeps the original casing
      // for display and navigation.
      addresses: Map<string, string>;
    }
  >();
  const txHashes = new Set<string>();
  let blobCount = 0;
  let blobSizeBytes = 0;

  transactions.forEach((tx) => {
    const user = tx.user || UNATTRIBUTED_MEMPOOL_USER;
    const group = groupsByUser.get(user) ?? {
      txHashes: new Set<string>(),
      blobCount: 0,
      blobSizeBytes: 0,
      addresses: new Map<string, string>(),
    };

    group.txHashes.add(tx.txHash);
    group.blobCount += tx.blobCount;
    group.blobSizeBytes += tx.blobSizeBytes;
    if (tx.fromAddressFull) {
      const key = tx.fromAddressFull.toLowerCase();
      if (!group.addresses.has(key)) {
        group.addresses.set(key, tx.fromAddressFull);
      }
    }
    groupsByUser.set(user, group);

    txHashes.add(tx.txHash);
    blobCount += tx.blobCount;
    blobSizeBytes += tx.blobSizeBytes;
  });

  const groups = Array.from(groupsByUser.entries())
    .map(([user, group]) => ({
      user,
      txCount: group.txHashes.size,
      blobCount: group.blobCount,
      blobSizeBytes: group.blobSizeBytes,
      address:
        group.addresses.size === 1
          ? group.addresses.values().next().value
          : undefined,
      // (values() yields the original-cased address stored above)
    }))
    .sort(
      (a, b) =>
        b.blobCount - a.blobCount ||
        b.txCount - a.txCount ||
        a.user.localeCompare(b.user)
    );

  return { txCount: txHashes.size, blobCount, blobSizeBytes, groups };
}
