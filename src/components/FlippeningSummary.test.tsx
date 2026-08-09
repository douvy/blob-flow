import { newestFlipInWindow } from './FlippeningSummary';
import type { FlippeningEvent } from '../lib/flippening';

const NOW = Date.parse('2026-08-09T12:00:00Z');

function flipAt(timestamp: string, winner = 'base', loser = 'arbitrum'): FlippeningEvent {
  return {
    bucketIndex: 0,
    timestamp,
    winner: { key: winner, name: winner },
    loser: { key: loser, name: loser },
    winnerSharePercent: 30,
    loserSharePercent: 28,
  };
}

describe('newestFlipInWindow', () => {
  it('ignores a flip older than the window the strip is describing', () => {
    // The analysis reads more history than the window on purpose, so a 24h
    // strip must not headline a flip from six days back.
    const events = [flipAt('2026-08-03T12:00:00Z')];

    expect(newestFlipInWindow(events, '24h', NOW)).toBeNull();
  });

  it('reports a flip inside the window', () => {
    const events = [flipAt('2026-08-09T06:00:00Z')];

    expect(newestFlipInWindow(events, '24h', NOW)?.timestamp).toBe('2026-08-09T06:00:00Z');
  });

  it('takes the newest of several flips in the window', () => {
    const events = [
      flipAt('2026-08-09T02:00:00Z', 'base', 'arbitrum'),
      flipAt('2026-08-09T09:00:00Z', 'arbitrum', 'base'),
    ];

    expect(newestFlipInWindow(events, '24h', NOW)?.winner.name).toBe('arbitrum');
  });

  it('skips out-of-window flips to find an older one that is still inside', () => {
    // Events arrive oldest first, but nothing guarantees the last one is the
    // most recent within the window once history runs past it.
    const events = [flipAt('2026-08-09T11:00:00Z'), flipAt('2026-05-01T00:00:00Z')];

    expect(newestFlipInWindow(events, '24h', NOW)?.timestamp).toBe('2026-08-09T11:00:00Z');
  });

  it('scales with the selected window', () => {
    const events = [flipAt('2026-08-09T11:30:00Z')];

    expect(newestFlipInWindow(events, '1h', NOW)).not.toBeNull();
    expect(newestFlipInWindow([flipAt('2026-08-09T10:00:00Z')], '1h', NOW)).toBeNull();
    expect(newestFlipInWindow([flipAt('2026-07-20T00:00:00Z')], '30d', NOW)).not.toBeNull();
  });

  it('does not claim an unparseable timestamp is recent', () => {
    expect(newestFlipInWindow([flipAt('not-a-date')], '30d', NOW)).toBeNull();
  });

  it('handles no analysis and no events', () => {
    expect(newestFlipInWindow(undefined, '24h', NOW)).toBeNull();
    expect(newestFlipInWindow([], '24h', NOW)).toBeNull();
  });
});
