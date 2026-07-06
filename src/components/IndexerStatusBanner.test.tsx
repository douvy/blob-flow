import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { BackfillStatus, StatusResponse } from '../types';
import IndexerStatusBanner, {
  computeBackfillCoveragePercent,
  computeLagSeconds,
} from './IndexerStatusBanner';

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

  it('shows overall blob history coverage while a backfill is running', () => {
    mockStatus(
      makeStatus({
        earliest_indexed_block: 19426587,
        current_chain_head: 25470973,
        backfill: makeBackfill({
          active: true,
          remaining_blocks: 5880887,
          progress_percent: 0.5,
        }),
      })
    );

    render(<IndexerStatusBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indexer is backfilling history: 2.7% of blob history indexed, 5,880,887 blocks remaining.'
    );
  });

  it('falls back to backfill run progress when coverage fields are absent', () => {
    mockStatus(
      makeStatus({
        earliest_indexed_block: undefined,
        backfill: makeBackfill({
          active: true,
          remaining_blocks: 1240,
          progress_percent: 43.5,
        }),
      })
    );

    render(<IndexerStatusBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Indexer is backfilling history: 43.5% complete, 1,240 blocks remaining.'
    );
  });

  it('renders nothing when a backfill is nearly caught up', () => {
    mockStatus(
      makeStatus({
        backfill: makeBackfill({
          active: true,
          remaining_blocks: 1,
          progress_percent: 99.4,
        }),
      })
    );

    const { container } = render(<IndexerStatusBanner />);

    expect(container).toBeEmptyDOMElement();
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
        earliest_indexed_block: 25467016,
        current_chain_head: 25468015,
        backfill: makeBackfill({ active: true, remaining_blocks: 500, progress_percent: 10 }),
      })
    );

    render(<IndexerStatusBanner />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('behind the chain head');
    expect(banner).toHaveTextContent('Backfilling: 50% of blob history indexed.');
  });
});

describe('computeBackfillCoveragePercent', () => {
  it('measures coverage of the full indexed range, not the backfill run', () => {
    const status = makeStatus({
      earliest_indexed_block: 19426587,
      current_chain_head: 25470973,
      backfill: makeBackfill({
        active: true,
        remaining_blocks: 5880887,
        progress_percent: 0.5,
      }),
    });

    expect(computeBackfillCoveragePercent(status)).toBeCloseTo(2.705, 3);
  });

  it('returns null when the backend omits the range fields', () => {
    expect(
      computeBackfillCoveragePercent(makeStatus({ earliest_indexed_block: undefined }))
    ).toBeNull();
    expect(
      computeBackfillCoveragePercent(
        makeStatus({ earliest_indexed_block: 19426587, current_chain_head: undefined })
      )
    ).toBeNull();
    expect(
      computeBackfillCoveragePercent(
        makeStatus({
          earliest_indexed_block: 19426587,
          current_chain_head: 25470973,
          backfill: undefined,
        })
      )
    ).toBeNull();
  });

  it('clamps coverage to the 0-100 range', () => {
    const overshoot = makeStatus({
      earliest_indexed_block: 25467016,
      current_chain_head: 25468015,
      backfill: makeBackfill({ active: true, remaining_blocks: 2000 }),
    });
    expect(computeBackfillCoveragePercent(overshoot)).toBe(0);

    const caughtUp = makeStatus({
      earliest_indexed_block: 25467016,
      current_chain_head: 25468015,
      backfill: makeBackfill({ active: true, remaining_blocks: 0 }),
    });
    expect(computeBackfillCoveragePercent(caughtUp)).toBe(100);
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
