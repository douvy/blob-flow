import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { TopUsersResponse } from '../types';
import { networkPath } from '../utils';
import UsersLeaderboard from './UsersLeaderboard';
import { TooltipProvider } from './ui/tooltip';

const routerPush = vi.fn();
const routerReplace = vi.fn();
let searchParams: URLSearchParams;

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  usePathname: () => '/users',
  useSearchParams: () => searchParams,
}));

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

const restData: TopUsersResponse = {
  data: [
    {
      id: 1,
      name: 'Arbitrum',
      address: '0x1111111111111111111111111111111111111111',
      attributed: true,
      dataCount: 60000,
      percentage: 60,
      totalCostEth: '0.6',
      totalCostWei: '600000000000000000',
      lastTimestamp: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Base',
      address: '0x2222222222222222222222222222222222222222',
      attributed: true,
      dataCount: 40000,
      percentage: 40,
      totalCostEth: '0.4',
      totalCostWei: '400000000000000000',
      lastTimestamp: '2026-01-01T00:00:10.000Z',
    },
    {
      id: 3,
      name: '0x3333...3333',
      address: '0x3333333333333333333333333333333333333333',
      attributed: false,
      dataCount: 1000,
      percentage: 1,
      totalCostEth: '0.01',
      totalCostWei: '10000000000000000',
      lastTimestamp: '2026-01-01T00:00:20.000Z',
    },
  ],
  hasServerShares: true,
};

function renderLeaderboard() {
  return render(
    <TooltipProvider>
      <UsersLeaderboard />
    </TooltipProvider>
  );
}

/** The query key the most recent fetch subscribed with. */
function lastQueryKey(): unknown[] {
  return vi.mocked(useApiData).mock.calls.at(-1)?.[1] as unknown[];
}

describe('UsersLeaderboard', () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    searchParams = new URLSearchParams();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<TopUsersResponse>).mockReturnValue({
      data: restData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders the fetched users with rank, count, and cost', () => {
    renderLeaderboard();

    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    // Rank comes from the server order, counts are formatted for reading.
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(new Intl.NumberFormat().format(60000))).toBeInTheDocument();
    expect(screen.getByText('0.6 ETH')).toBeInTheDocument();
  });

  it('defaults to the all-time window', () => {
    renderLeaderboard();

    expect(lastQueryKey()).toContain('all');
  });

  it('opens on the window a shared link carries', () => {
    searchParams = new URLSearchParams('range=7d');

    renderLeaderboard();

    expect(lastQueryKey()).toContain('7d');
  });

  it('rewrites the URL when a window is picked, keeping unrelated params', () => {
    searchParams = new URLSearchParams('utm_source=x');

    renderLeaderboard();
    fireEvent.click(screen.getByRole('button', { name: '30d' }));

    expect(routerReplace).toHaveBeenCalledWith('/users?utm_source=x&range=30d', {
      scroll: false,
    });
  });

  it('navigates to the entity page when an attributed row is clicked', () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole('link', { name: 'View activity for Arbitrum' }));

    // The entity page aggregates every address the registry maps to the
    // entity; this row may only be one of them.
    expect(routerPush).toHaveBeenCalledWith(
      networkPath('/entity/arbitrum', DEFAULT_NETWORK.apiParam)
    );
  });

  it('navigates to the address page when an unattributed row is clicked', () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole('link', { name: 'View activity for 0x3333...3333' }));

    expect(routerPush).toHaveBeenCalledWith(
      networkPath(
        '/user/0x3333333333333333333333333333333333333333',
        DEFAULT_NETWORK.apiParam
      )
    );
  });

  it('shows an empty state when the window has no activity', () => {
    vi.mocked(useApiData<TopUsersResponse>).mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderLeaderboard();

    expect(screen.getByText('No blob activity in this window.')).toBeInTheDocument();
  });
});
