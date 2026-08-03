import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useTimeRange } from '../contexts/TimeRangeContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { TopUsersResponse, UsersUpdateEvent } from '../types';
import TopUsersTable from './TopUsersTable';
import { TooltipProvider } from './ui/tooltip';

let usersUpdateHandler: ((event: UsersUpdateEvent) => void) | undefined;

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../contexts/TimeRangeContext', () => ({
  useTimeRange: vi.fn(),
}));

vi.mock('../contexts/LiveDataContext', () => ({
  useLiveBlobEvent: vi.fn((eventType: unknown, handler: unknown) => {
    if (eventType === 'users_update') {
      usersUpdateHandler = handler as (event: UsersUpdateEvent) => void;
    }
  }),
}));

vi.mock('../hooks/useFlipRows', () => ({
  useFlipRows: vi.fn(),
}));

const restData: TopUsersResponse = {
  data: [
    {
      id: 1,
      name: 'Arbitrum',
      address: '0x1111111111111111111111111111111111111111',
      attributed: true,
      dataCount: 6,
      percentage: 60,
      totalCostEth: '0.6',
      lastTimestamp: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Base',
      address: '0x2222222222222222222222222222222222222222',
      attributed: true,
      dataCount: 4,
      percentage: 40,
      totalCostEth: '0.4',
      lastTimestamp: '2026-01-01T00:00:10.000Z',
    },
  ],
};

function liveEvent(range: UsersUpdateEvent['range']): UsersUpdateEvent {
  return {
    type: 'users_update',
    range,
    data: [
      {
        network_id: 1,
        address: '0x3333333333333333333333333333333333333333',
        name: 'Optimism',
        blob_count: 9,
        total_cost_eth: '0.9',
        last_timestamp: '2026-01-01T00:01:00.000Z',
        blob_share_percent: 45,
      },
    ],
  };
}

function renderTable() {
  return render(
    <TooltipProvider>
      <TopUsersTable />
    </TooltipProvider>
  );
}

function seedRankSnapshot(entries: { address: string; dataCount: number }[], savedAt = 1000) {
  window.localStorage.setItem(
    `topUsersRankSnapshot:${DEFAULT_NETWORK.apiParam}:1h`,
    JSON.stringify({ savedAt, entries })
  );
}

describe('TopUsersTable', () => {
  beforeEach(() => {
    usersUpdateHandler = undefined;
    window.localStorage.clear();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useTimeRange).mockReturnValue({
      timeRange: '1h',
      setTimeRange: vi.fn(),
    });
    vi.mocked(useApiData<TopUsersResponse>).mockReturnValue({
      data: restData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders the fetched users', () => {
    renderTable();

    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('shows the selected timeframe in the heading', () => {
    const { rerender } = renderTable();

    expect(
      screen.getByRole('heading', { name: 'Top Blob Users Last hour' })
    ).toBeInTheDocument();
    expect(vi.mocked(useApiData).mock.calls.at(-1)?.[1]).toContain('1h');

    vi.mocked(useTimeRange).mockReturnValue({
      timeRange: '30d',
      setTimeRange: vi.fn(),
    });
    rerender(
      <TooltipProvider>
        <TopUsersTable />
      </TooltipProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Top Blob Users Last 30 days' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Last hour')).not.toBeInTheDocument();
    expect(vi.mocked(useApiData).mock.calls.at(-1)?.[1]).toContain('30d');
  });

  it('applies live updates scoped to the selected range', () => {
    renderTable();

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });

    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.queryByText('Arbitrum')).not.toBeInTheDocument();
  });

  it('ignores live updates scoped to a different range', () => {
    renderTable();

    act(() => {
      usersUpdateHandler?.(liveEvent('24h'));
    });

    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.queryByText('Optimism')).not.toBeInTheDocument();
  });

  it('renders medal rank markers for podium rows', () => {
    renderTable();

    expect(screen.getByText('Rank 1')).toBeInTheDocument();
    expect(screen.getByText('Rank 2')).toBeInTheDocument();
  });

  it('shows no movement indicators or caption on a first visit', () => {
    renderTable();

    expect(screen.queryByText(/since your last visit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rank movement compares/)).not.toBeInTheDocument();
  });

  it('shows movement against the ranking stored from the last visit', () => {
    // Last visit: Base led, Arbitrum trailed, and 0x99... has since left.
    seedRankSnapshot([
      { address: '0x2222222222222222222222222222222222222222', dataCount: 10 },
      { address: '0x1111111111111111111111111111111111111111', dataCount: 5 },
      { address: '0x9999999999999999999999999999999999999999', dataCount: 1 },
    ]);

    renderTable();

    expect(screen.getByText('Up 1 place since your last visit')).toBeInTheDocument();
    expect(screen.getByText('Down 1 place since your last visit')).toBeInTheDocument();
    expect(screen.getByText(/Rank movement compares/)).toBeInTheDocument();
  });

  it('marks entrants absent from the stored ranking as new', () => {
    seedRankSnapshot([
      { address: '0x1111111111111111111111111111111111111111', dataCount: 6 },
    ]);

    renderTable();

    expect(screen.getByText('New entry since your last visit')).toBeInTheDocument();
    expect(screen.getByText('No rank change since your last visit')).toBeInTheDocument();
  });

  it('persists the current ranking for the next visit', () => {
    renderTable();

    const stored = window.localStorage.getItem(
      `topUsersRankSnapshot:${DEFAULT_NETWORK.apiParam}:1h`
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '');
    expect(parsed.entries).toEqual([
      { address: '0x1111111111111111111111111111111111111111', dataCount: 6 },
      { address: '0x2222222222222222222222222222222222222222', dataCount: 4 },
    ]);
  });

  it('falls back to fetched data when the selected range changes', () => {
    const { rerender } = renderTable();

    act(() => {
      usersUpdateHandler?.(liveEvent('1h'));
    });
    expect(screen.getByText('Optimism')).toBeInTheDocument();

    vi.mocked(useTimeRange).mockReturnValue({
      timeRange: '24h',
      setTimeRange: vi.fn(),
    });
    rerender(
      <TooltipProvider>
        <TopUsersTable />
      </TooltipProvider>
    );

    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.queryByText('Optimism')).not.toBeInTheDocument();
  });
});
