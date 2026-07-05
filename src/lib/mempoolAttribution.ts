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
    { txHashes: Set<string>; blobCount: number; blobSizeBytes: number }
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
    };

    group.txHashes.add(tx.txHash);
    group.blobCount += tx.blobCount;
    group.blobSizeBytes += tx.blobSizeBytes;
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
    }))
    .sort(
      (a, b) =>
        b.blobCount - a.blobCount ||
        b.txCount - a.txCount ||
        a.user.localeCompare(b.user)
    );

  return { txCount: txHashes.size, blobCount, blobSizeBytes, groups };
}
