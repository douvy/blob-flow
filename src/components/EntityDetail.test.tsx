import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { BlobResponse, EntityDetail as EntityDetailData } from '../types';
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

// The component reads three queries through the same mocked hook; dispatch
// on the query key so the entity fixture only answers the entity query.
function mockEntity(
  data: EntityDetailData | null | undefined,
  blobs: { confirmed?: BlobResponse[]; mempool?: BlobResponse[] } = {}
) {
  vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
    const key = Array.isArray(queryKey) ? queryKey : [queryKey];
    if (key[0] === 'entity') {
      return { data, isLoading: data === undefined, error: null, refetch: vi.fn() };
    }
    const list = key[3] === 'mempool' ? blobs.mempool : blobs.confirmed;
    return { data: list ?? [], isLoading: false, error: null, refetch: vi.fn() };
  });
}

function makeBlob(overrides: Partial<BlobResponse> = {}): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 123456,
    blob_index: 0,
    tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    from_address: ADDRESS_A,
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1',
    tip_per_blob_gas: '0',
    total_cost_eth: '0.0001',
    timestamp: '2026-08-09T00:00:00.000Z',
    confirmed: true,
    ...overrides,
  };
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

  it('renders aggregated recent blobs with the posting address', () => {
    const txHash = '0x2222222222222222222222222222222222222222222222222222222222222222';
    mockEntity(scroll, {
      confirmed: [
        makeBlob({ from_address: ADDRESS_A }),
        makeBlob({ tx_hash: txHash, from_address: ADDRESS_B }),
      ],
    });
    render(<EntityDetail slug="scroll" />);

    expect(screen.getByRole('heading', { name: 'Recent Blobs' })).toBeInTheDocument();
    // Each row names its sender, since the list spans several addresses.
    // The addresses table also shows both, so expect one extra occurrence.
    expect(screen.getAllByText('0xaaaa...aaaa')).toHaveLength(2);
    expect(screen.getAllByText('0xbbbb...bbbb')).toHaveLength(2);
  });

  it('queries every active address for confirmed blobs and only registry addresses for pending', () => {
    // Nine active senders, all retired: no cap may drop the tail, and the
    // pending query must not fall back to retired addresses, since the
    // registry no longer attributes their new activity to the entity.
    const addresses = [...Array(9)].map((_, index) => ({
      address: `0x${String(index).repeat(40)}`,
      dataCount: 100 - index,
      totalCostEth: '1',
      totalCostWei: '1000000000000000000',
      lastTimestamp: '2026-08-09T00:00:00.000Z',
      inRegistry: false,
    }));
    mockEntity({ ...scroll, addresses });
    // Call history persists across tests in this suite; drop earlier
    // renders' calls so the keys below come from this one.
    vi.mocked(useApiData).mockClear();
    render(<EntityDetail slug="scroll" />);

    const keys = vi.mocked(useApiData).mock.calls.map(([, queryKey]) => queryKey as unknown[]);
    const confirmedKey = keys.find((key) => key[0] === 'entity-blobs' && key[3] === 'confirmed');
    const mempoolKey = keys.find((key) => key[0] === 'entity-blobs' && key[3] === 'mempool');

    expect(confirmedKey?.[4]).toBe(addresses.map((a) => a.address).join(','));
    expect(mempoolKey?.[4]).toBe('');
  });

  it('summarizes pending blobs in the collapsible header', () => {
    mockEntity(scroll, {
      mempool: [
        makeBlob({ confirmed: false, block_number: null, from_address: ADDRESS_B }),
      ],
    });
    render(<EntityDetail slug="scroll" />);

    const toggle = screen.getByRole('button', { name: /pending blobs/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.textContent).toContain('1 tx');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // The expanded table shows the pending tx, truncated.
    expect(screen.getByText('0x11111111...1111')).toBeInTheDocument();
  });
});
