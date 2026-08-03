import { describe, expect, it } from 'vitest';
import {
  competitionRanks,
  computeRankMovements,
  parseRankSnapshot,
  type RankSnapshotEntry,
} from './rankMovement';

function entry(address: string, dataCount: number): RankSnapshotEntry {
  return { address, dataCount };
}

describe('competitionRanks', () => {
  it('ranks by count descending', () => {
    const ranks = competitionRanks([entry('0xa', 5), entry('0xb', 9), entry('0xc', 1)]);

    expect(ranks.get('0xa')).toBe(2);
    expect(ranks.get('0xb')).toBe(1);
    expect(ranks.get('0xc')).toBe(3);
  });

  it('gives tied counts the same rank and skips the next rank', () => {
    const ranks = competitionRanks([
      entry('0xa', 9),
      entry('0xb', 5),
      entry('0xc', 5),
      entry('0xd', 1),
    ]);

    expect(ranks.get('0xa')).toBe(1);
    expect(ranks.get('0xb')).toBe(2);
    expect(ranks.get('0xc')).toBe(2);
    expect(ranks.get('0xd')).toBe(4);
  });

  it('normalizes address casing in its keys', () => {
    const ranks = competitionRanks([entry('0xAbC', 3)]);

    expect(ranks.get('0xabc')).toBe(1);
  });
});

describe('computeRankMovements', () => {
  it('returns an empty map when there is no previous snapshot', () => {
    expect(computeRankMovements([entry('0xa', 5)], null).size).toBe(0);
    expect(computeRankMovements([entry('0xa', 5)], undefined).size).toBe(0);
  });

  it('returns an empty map when the previous snapshot is empty', () => {
    expect(computeRankMovements([entry('0xa', 5)], []).size).toBe(0);
  });

  it('reports up and down movement with the number of places', () => {
    const previous = [entry('0xa', 9), entry('0xb', 5), entry('0xc', 3)];
    const current = [entry('0xc', 10), entry('0xa', 9), entry('0xb', 5)];

    const movements = computeRankMovements(current, previous);

    expect(movements.get('0xc')).toEqual({ kind: 'up', places: 2 });
    expect(movements.get('0xa')).toEqual({ kind: 'down', places: 1 });
    expect(movements.get('0xb')).toEqual({ kind: 'down', places: 1 });
  });

  it('reports unchanged positions as same', () => {
    const rows = [entry('0xa', 9), entry('0xb', 5)];

    const movements = computeRankMovements(rows, rows);

    expect(movements.get('0xa')).toEqual({ kind: 'same' });
    expect(movements.get('0xb')).toEqual({ kind: 'same' });
  });

  it('marks entries absent from the previous snapshot as new', () => {
    const previous = [entry('0xa', 9)];
    const current = [entry('0xa', 9), entry('0xb', 5)];

    const movements = computeRankMovements(current, previous);

    expect(movements.get('0xb')).toEqual({ kind: 'new' });
    expect(movements.get('0xa')).toEqual({ kind: 'same' });
  });

  it('omits entries that left the leaderboard', () => {
    const previous = [entry('0xa', 9), entry('0xgone', 8)];
    const current = [entry('0xa', 9)];

    const movements = computeRankMovements(current, previous);

    expect(movements.has('0xgone')).toBe(false);
    expect(movements.size).toBe(1);
  });

  it('does not fabricate movement when tied rows swap order', () => {
    const previous = [entry('0xa', 5), entry('0xb', 5)];
    const current = [entry('0xb', 5), entry('0xa', 5)];

    const movements = computeRankMovements(current, previous);

    expect(movements.get('0xa')).toEqual({ kind: 'same' });
    expect(movements.get('0xb')).toEqual({ kind: 'same' });
  });

  it('matches addresses case-insensitively across snapshots', () => {
    const previous = [entry('0xABC', 5)];
    const current = [entry('0xabc', 5)];

    const movements = computeRankMovements(current, previous);

    expect(movements.get('0xabc')).toEqual({ kind: 'same' });
  });
});

describe('parseRankSnapshot', () => {
  it('parses a well-formed snapshot', () => {
    const raw = JSON.stringify({
      savedAt: 1234,
      entries: [{ address: '0xa', dataCount: 5 }],
    });

    expect(parseRankSnapshot(raw)).toEqual({
      savedAt: 1234,
      entries: [{ address: '0xa', dataCount: 5 }],
    });
  });

  it('rejects null, malformed JSON, and wrong shapes', () => {
    expect(parseRankSnapshot(null)).toBeNull();
    expect(parseRankSnapshot('not json')).toBeNull();
    expect(parseRankSnapshot('42')).toBeNull();
    expect(parseRankSnapshot(JSON.stringify({ savedAt: 'later', entries: [] }))).toBeNull();
    expect(parseRankSnapshot(JSON.stringify({ savedAt: 1, entries: 'nope' }))).toBeNull();
    expect(
      parseRankSnapshot(JSON.stringify({ savedAt: 1, entries: [{ address: 7, dataCount: 1 }] }))
    ).toBeNull();
  });
});
