import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { BackfillStatus, StatusResponse } from '../types';
import IndexerStatusBanner, { computeLagSeconds } from './IndexerStatusBanner';

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function makeBackfill(overrides: Partial<BackfillStatus> = {}): BackfillStatus {
  return {
    active: false,
    start_block: 25467993,
    current_block: 25468015,
    target_block: 25468015,
    remaining_blocks: 0,
    progress_percent: 100,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStatus(overrides: Partial<StatusResponse> = {}): StatusResponse {
  return {
    chain_id: 1,
    network_name: 'mainnet',
    last_indexed_block: 25468015,
    indexer_version: '0.10.0',
    uptime: '9h54m20s',
    last_indexed_time: new Date(Date.now() - 5_000).toISOString(),
    current_chain_head: 25468015,
    indexer_lag_blocks: 0,
    backfill: makeBackfill(),
    ...overrides,
  };
}

function mockStatus(status: StatusResponse | undefined) {
  vi.mocked(useApiData<StatusResponse>).mockReturnValue({
    data: status,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('IndexerStatusBanner', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('renders nothing while status is unavailable', () => {
    mockStatus(undefined);

    const { container } = render(<IndexerStatusBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the indexer is healthy', () => {
    mockStatus(makeStatus());

    const { container } = render(<IndexerStatusBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a backfill notice while a backfill is running', () => {
    mockStatus(
      makeStatus({
        backfill: makeBackfill({
          active: true,
          remaining_blocks: 1240,
          progress_percent: 43.5,
        }),
      })
    );

    render(<IndexerStatusBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indexer is backfilling history — 43.5% complete, 1,240 blocks remaining.'
    );
  });

  it('shows a lag warning when the indexer trails the chain head', () => {
    mockStatus(
      makeStatus({
        indexer_lag_blocks: 100,
        last_indexed_block: 25467915,
      })
    );

    render(<IndexerStatusBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indexer is 20 min behind the chain head (last indexed block 25,467,915).'
    );
  });

  it('falls back to last indexed time when block lag is unreported', () => {
    mockStatus(
      makeStatus({
        indexer_lag_blocks: undefined,
        last_indexed_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      })
    );

    render(<IndexerStatusBanner />);

    expect(screen.getByRole('status')).toHaveTextContent('behind the chain head');
  });

  it('keeps the lag warning when a backfill is also running', () => {
    mockStatus(
      makeStatus({
        indexer_lag_blocks: 100,
        backfill: makeBackfill({ active: true, remaining_blocks: 500, progress_percent: 10 }),
      })
    );

    render(<IndexerStatusBanner />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('behind the chain head');
    expect(banner).toHaveTextContent('Backfilling — 10% complete.');
  });
});

describe('computeLagSeconds', () => {
  it('uses the larger of block lag and last indexed age', () => {
    const now = Date.parse('2026-07-05T12:10:00Z');

    const blockLagDominates = makeStatus({
      indexer_lag_blocks: 100,
      last_indexed_time: '2026-07-05T12:09:00Z',
    });
    expect(computeLagSeconds(blockLagDominates, now)).toBe(1200);

    const timeLagDominates = makeStatus({
      indexer_lag_blocks: 0,
      last_indexed_time: '2026-07-05T12:00:00Z',
    });
    expect(computeLagSeconds(timeLagDominates, now)).toBe(600);
  });

  it('ignores an unparseable last indexed time', () => {
    const status = makeStatus({ indexer_lag_blocks: 5, last_indexed_time: 'not-a-date' });

    expect(computeLagSeconds(status, Date.now())).toBe(60);
  });
});
