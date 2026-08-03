"use client";

import React from 'react';
import { User } from '../types';
import {
  computeRankMovements,
  parseRankSnapshot,
  toRankSnapshotEntries,
  type RankMovement,
  type RankSnapshot,
} from '../lib/rankMovement';

const STORAGE_PREFIX = 'topUsersRankSnapshot:';

function storageKeyFor(scopeKey: string): string {
  return `${STORAGE_PREFIX}${scopeKey}`;
}

function readStoredSnapshot(scopeKey: string): RankSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseRankSnapshot(window.localStorage.getItem(storageKeyFor(scopeKey)));
  } catch {
    return null;
  }
}

/**
 * Rank movement for the top-users leaderboard, measured against the ranking
 * on screen when the user last viewed this scope ("since you last looked").
 * The backend has no historical-rank endpoint, so the previous ranking is a
 * client-side localStorage snapshot kept per (network, range) scope.
 *
 * The baseline is read when the scope is entered and then frozen for as long
 * as the scope stays selected, while the current ranking is written back on
 * every change. Freezing matters: comparing against the freshly written
 * snapshot would collapse every arrow to "no change" one render after it
 * appeared. Switching scope and back re-reads storage, so movement is always
 * relative to the ranking last shown for that scope.
 *
 * useLocalStorage is deliberately not used here: it captures its key in a
 * mount-time state initializer, and this hook's key changes whenever the
 * user switches network or time range.
 */
export function useRankMovements(
  scopeKey: string,
  users: readonly User[]
): { movements: ReadonlyMap<string, RankMovement>; baselineAt: number | null } {
  const baseline = React.useMemo(() => readStoredSnapshot(scopeKey), [scopeKey]);

  React.useEffect(() => {
    if (users.length === 0) return;
    try {
      const snapshot: RankSnapshot = {
        savedAt: Date.now(),
        entries: toRankSnapshotEntries(users),
      };
      window.localStorage.setItem(storageKeyFor(scopeKey), JSON.stringify(snapshot));
    } catch {
      // Storage can be unavailable (private browsing, quota). Movement is an
      // enhancement, so fail silently the same way useLocalStorage does.
    }
  }, [scopeKey, users]);

  const movements = React.useMemo(
    () => computeRankMovements(toRankSnapshotEntries(users), baseline?.entries ?? null),
    [users, baseline]
  );

  return { movements, baselineAt: baseline?.savedAt ?? null };
}
