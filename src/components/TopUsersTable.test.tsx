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
      dataCount: 6,
      percentage: 60,
      totalCostEth: '0.6',
      lastTimestamp: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Base',
      address: '0x2222222222222222222222222222222222222222',
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

describe('TopUsersTable', () => {
  beforeEach(() => {
    usersUpdateHandler = undefined;
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
