import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import type { TimeRange } from '../contexts/TimeRangeContext';
import { useFlippening } from '../hooks/useFlippening';
import { useNetwork } from '../hooks/useNetwork';
import { useRollupAddresses } from '../hooks/useRollupAddresses';
import type { FlippeningAnalysis, FlippeningEntity } from '../lib/flippening';
import FlippeningWatch from './FlippeningWatch';
import { TooltipProvider } from './ui/tooltip';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('../hooks/useFlippening', () => ({
  useFlippening: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../hooks/useRollupAddresses', () => ({
  useRollupAddresses: vi.fn(),
}));

const BASE_ADDRESS = '0x5050F69a9786F081509234F1a7F4684b5E5b76C9';
const ROBINHOOD_ADDRESS = '0xDaa526086787d9DEbE1D7F3FFdb1fE50cf8687F4';

const base: FlippeningEntity = { key: 'base', name: 'Base' };
const robinhood: FlippeningEntity = { key: 'robinhood_chain', name: 'Robinhood Chain' };
const anon: FlippeningEntity = {
  key: 'unknown_0xabc',
  name: '0xabcd...cdef',
  address: '0xabcdef0000000000000000000000000000000000',
};

function standing(entity: FlippeningEntity, rank: number, sharePercent: number) {
  return {
    rank,
    entity,
    sharePercent,
    gapToAbovePoints: rank === 1 ? null : 1.1,
    lastFlipWon: null,
    lastFlipLost: null,
  };
}

function analysis(overrides: Partial<FlippeningAnalysis> = {}): FlippeningAnalysis {
  return {
    entities: [robinhood, base],
    events: [],
    standings: [standing(robinhood, 1, 25.8), standing(base, 2, 24.7)],
    closestGap: {
      leader: robinhood,
      trailer: base,
      leaderSharePercent: 25.8,
      trailerSharePercent: 24.7,
      gapPoints: 1.1,
    },
    ...overrides,
  };
}

function renderWatch(data: FlippeningAnalysis, timeRange: TimeRange = '24h') {
  vi.mocked(useFlippening).mockReturnValue({
    analysis: data,
    timeRange,
    historyRange: '7d',
    isLoading: false,
    error: null,
  });
  return render(
    <TooltipProvider>
      <FlippeningWatch />
    </TooltipProvider>
  );
}

describe('FlippeningWatch rollup links', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReset();
    vi.mocked(useFlippening).mockReset();
    vi.mocked(useRollupAddresses).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
    } as unknown as ReturnType<typeof useNetwork>);
    vi.mocked(useRollupAddresses).mockReturnValue(
      new Map([
        ['base', BASE_ADDRESS],
        ['robinhood chain', ROBINHOOD_ADDRESS],
      ])
    );
  });

  it('links a rollup name to its own blob activity', () => {
    renderWatch(analysis());

    for (const link of screen.getAllByRole('link', { name: 'Robinhood Chain' })) {
      expect(link).toHaveAttribute('href', `/user/${ROBINHOOD_ADDRESS}`);
    }
    for (const link of screen.getAllByRole('link', { name: 'Base' })) {
      expect(link).toHaveAttribute('href', `/user/${BASE_ADDRESS}`);
    }
  });

  it('links every place a name is shown: the race, the standings, and the feed', () => {
    renderWatch(
      analysis({
        events: [
          {
            bucketIndex: 4,
            timestamp: '2026-08-09T10:00:00Z',
            winner: robinhood,
            loser: base,
            winnerSharePercent: 25.8,
            loserSharePercent: 24.7,
          },
        ],
      })
    );

    const race = screen.getByText(/Closest to flipping/i).parentElement as HTMLElement;
    const standings = screen.getByText(/Standings in/i).parentElement as HTMLElement;
    const feed = screen.getByText(/Recent flippenings/i).parentElement as HTMLElement;

    for (const section of [race, standings, feed]) {
      expect(within(section).getAllByRole('link', { name: 'Base' })[0]).toHaveAttribute(
        'href',
        `/user/${BASE_ADDRESS}`
      );
    }
  });

  it('links a rollup the flip feed says was passed', () => {
    const flip = {
      bucketIndex: 4,
      timestamp: '2026-08-09T10:00:00Z',
      winner: robinhood,
      loser: base,
      winnerSharePercent: 25.8,
      loserSharePercent: 24.7,
    };
    renderWatch(
      analysis({
        events: [flip],
        standings: [
          { ...standing(robinhood, 1, 25.8), lastFlipWon: flip },
          { ...standing(base, 2, 24.7), lastFlipLost: flip },
        ],
      })
    );

    const badge = screen.getByText(/passed/i);
    expect(within(badge).getByRole('link', { name: 'Base' })).toHaveAttribute(
      'href',
      `/user/${BASE_ADDRESS}`
    );
  });

  it('uses the address an unnamed sender already carries', () => {
    renderWatch(
      analysis({
        entities: [robinhood, anon],
        standings: [standing(robinhood, 1, 25.8), standing(anon, 2, 24.7)],
        closestGap: {
          leader: robinhood,
          trailer: anon,
          leaderSharePercent: 25.8,
          trailerSharePercent: 24.7,
          gapPoints: 1.1,
        },
      })
    );

    expect(screen.getAllByRole('link', { name: anon.name })[0]).toHaveAttribute(
      'href',
      `/user/${anon.address}`
    );
  });

  it('leaves a name with no known address as plain text', () => {
    // The user list is the only bridge from a chart name to an address, so a
    // rollup missing from it must not link to a made-up page.
    vi.mocked(useRollupAddresses).mockReturnValue(new Map());
    renderWatch(analysis());

    expect(screen.queryByRole('link', { name: 'Base' })).toBeNull();
    expect(screen.getAllByText('Base').length).toBeGreaterThan(0);
  });
});
