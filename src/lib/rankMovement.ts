import { User } from '../types';

export interface RankSnapshotEntry {
  address: string;
  dataCount: number;
}

/** Ranking persisted per (network, range) scope, stamped when it was saved. */
export interface RankSnapshot {
  savedAt: number;
  entries: RankSnapshotEntry[];
}

export type RankMovement =
  | { kind: 'new' }
  | { kind: 'same' }
  | { kind: 'up'; places: number }
  | { kind: 'down'; places: number };

/** Addresses are compared case-insensitively; backends differ on checksum casing. */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function toRankSnapshotEntries(users: readonly User[]): RankSnapshotEntry[] {
  return users.map((user) => ({ address: user.address, dataCount: user.dataCount }));
}

/**
 * Competition ranking ("1224"): an entry's rank is one plus the number of
 * entries with a strictly higher count, so tied counts share a rank. Without
 * this, a backend that reorders tied rows between fetches would fabricate
 * up/down movement where nothing actually changed.
 */
export function competitionRanks(
  entries: readonly RankSnapshotEntry[]
): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const entry of entries) {
    let higher = 0;
    for (const other of entries) {
      if (other.dataCount > entry.dataCount) higher++;
    }
    ranks.set(normalizeAddress(entry.address), higher + 1);
  }
  return ranks;
}

/**
 * Movement of each current entry relative to a previously seen ranking,
 * keyed by normalized address.
 *
 * An empty or missing previous ranking yields an empty map: with no baseline
 * there is nothing honest to say, and labeling every row "new" on a first
 * visit would be noise. Entries that left the leaderboard simply have no key
 * in the result; entries that entered it are marked "new".
 */
export function computeRankMovements(
  current: readonly RankSnapshotEntry[],
  previous: readonly RankSnapshotEntry[] | null | undefined
): Map<string, RankMovement> {
  const movements = new Map<string, RankMovement>();
  if (!previous || previous.length === 0) return movements;

  const currentRanks = competitionRanks(current);
  const previousRanks = competitionRanks(previous);

  for (const entry of current) {
    const address = normalizeAddress(entry.address);
    const currentRank = currentRanks.get(address);
    if (currentRank === undefined) continue;

    const previousRank = previousRanks.get(address);
    if (previousRank === undefined) {
      movements.set(address, { kind: 'new' });
    } else if (previousRank === currentRank) {
      movements.set(address, { kind: 'same' });
    } else if (previousRank > currentRank) {
      movements.set(address, { kind: 'up', places: previousRank - currentRank });
    } else {
      movements.set(address, { kind: 'down', places: currentRank - previousRank });
    }
  }

  return movements;
}

/**
 * Parse a stored snapshot, rejecting anything malformed (older builds, manual
 * edits, other apps sharing the origin). Returning null makes corrupt storage
 * behave exactly like a first visit.
 */
export function parseRankSnapshot(raw: string | null): RankSnapshot | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { savedAt, entries } = parsed as { savedAt?: unknown; entries?: unknown };
    if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null;
    if (!Array.isArray(entries)) return null;

    const valid = entries.every((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as { address?: unknown; dataCount?: unknown };
      return (
        typeof candidate.address === 'string' &&
        typeof candidate.dataCount === 'number' &&
        Number.isFinite(candidate.dataCount)
      );
    });
    if (!valid) return null;

    return { savedAt, entries: entries as RankSnapshotEntry[] };
  } catch {
    return null;
  }
}
