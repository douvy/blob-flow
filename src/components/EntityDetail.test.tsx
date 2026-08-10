import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { EntityDetail as EntityDetailData } from '../types';
import { networkPath } from '../utils';
import EntityDetail from './EntityDetail';

const routerPush = vi.fn();

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

const ADDRESS_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ADDRESS_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const scroll: EntityDetailData = {
  key: 'scroll',
  slug: 'scroll',
  name: 'Scroll',
  category: 'rollup',
  totalDataCount: 348007,
  totalCostWei: '20901160000000000000',
  totalCostEth: '20.90116',
  lastTimestamp: '2026-08-09T00:00:00.000Z',
  blobSharePercent: 0.84,
  spendSharePercent: 0.7,
  addresses: [
    {
      address: ADDRESS_A,
      dataCount: 180213,
      totalCostEth: '10.927065',
      totalCostWei: '10927065000000000000',
      lastTimestamp: '2024-12-25T00:00:00.000Z',
      inRegistry: false,
    },
    {
      address: ADDRESS_B,
      dataCount: 167794,
      totalCostEth: '9.974095',
      totalCostWei: '9974095000000000000',
      lastTimestamp: '2026-08-09T00:00:00.000Z',
      inRegistry: true,
    },
    {
      address: '0xdddddddddddddddddddddddddddddddddddddddd',
      dataCount: 0,
      totalCostEth: '0',
      totalCostWei: '0',
      lastTimestamp: null,
      inRegistry: true,
    },
  ],
};

function mockEntity(data: EntityDetailData | null | undefined) {
  vi.mocked(useApiData<EntityDetailData | null>).mockReturnValue({
    data,
    isLoading: data === undefined,
    error: null,
    refetch: vi.fn(),
  });
}

describe('EntityDetail', () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('renders aggregate stats and every address row', () => {
    mockEntity(scroll);
    render(<EntityDetail slug="scroll" />);

    expect(screen.getByRole('heading', { name: 'Scroll' })).toBeInTheDocument();
    expect(screen.getByText(new Intl.NumberFormat().format(348007))).toBeInTheDocument();
    // The exact wei sum renders as ETH.
    expect(screen.getByText('20.90116 ETH')).toBeInTheDocument();
    expect(screen.getByText('0xaaaa...aaaa')).toBeInTheDocument();
    expect(screen.getByText('0xbbbb...bbbb')).toBeInTheDocument();
  });

  it('names the blob share and flags retired addresses', () => {
    mockEntity(scroll);
    render(<EntityDetail slug="scroll" />);

    expect(screen.getByText(/0\.8% of all blobs posted/)).toBeInTheDocument();
    // ADDRESS_A is attributed only in indexed history.
    expect(screen.getByText('retired')).toBeInTheDocument();
    // The zero-activity registry address renders with no last-active time.
    expect(screen.getByText('0xdddd...dddd')).toBeInTheDocument();
  });

  it('navigates to the address page when a row is clicked', () => {
    mockEntity(scroll);
    render(<EntityDetail slug="scroll" />);

    fireEvent.click(screen.getByRole('link', { name: `View activity for ${ADDRESS_A}` }));

    expect(routerPush).toHaveBeenCalledWith(
      networkPath(`/user/${ADDRESS_A}`, DEFAULT_NETWORK.apiParam)
    );
  });

  it('shows a not-found state when no entity matches the slug', () => {
    mockEntity(null);
    render(<EntityDetail slug="nope" />);

    expect(screen.getByText('Entity not found')).toBeInTheDocument();
  });
});
