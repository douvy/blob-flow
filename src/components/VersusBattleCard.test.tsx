import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK, NETWORKS } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import type { BackendAttributionUsageShare, Network } from '@/types';
import VersusBattleCard from './VersusBattleCard';

const push = vi.fn();

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function share(overrides: Partial<BackendAttributionUsageShare>): BackendAttributionUsageShare {
  return {
    key: 'base',
    name: 'Base',
    category: 'rollup',
    blob_count: 100,
    total_cost_wei: '1000000',
    blob_share_percent: 50,
    spend_share_percent: 50,
    ...overrides,
  };
}

const SHARES = [
  share({ key: 'base', name: 'Base' }),
  share({ key: 'op_mainnet', name: 'OP Mainnet', blob_count: 60 }),
  share({ key: 'arbitrum_one', name: 'Arbitrum One', blob_count: 40 }),
];

function onNetwork(network: Network) {
  vi.mocked(useNetwork).mockReturnValue({
    selectedNetwork: network,
    setSelectedNetwork: vi.fn(),
    networkOptions: [DEFAULT_NETWORK, NETWORKS.SEPOLIA],
  });
}

describe('VersusBattleCard', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(useApiData).mockReturnValue({
      data: { summary: { shares: SHARES } },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useApiData>);
    onNetwork(DEFAULT_NETWORK);
  });

  it('keeps the default network on the bare battle paths', () => {
    render(<VersusBattleCard aSlug="base" bSlug="op-mainnet" range="24h" />);

    expect(screen.getByRole('link', { name: '7d' })).toHaveAttribute(
      'href',
      '/vs/base/op-mainnet/7d'
    );
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/');
  });

  // Switching network reloads the same path under the network's prefix, so
  // every link out of this page has to carry the prefix back.
  it('keeps its own links on the network being viewed', () => {
    onNetwork(NETWORKS.SEPOLIA);
    render(<VersusBattleCard aSlug="base" bSlug="op-mainnet" range="24h" />);

    expect(screen.getByRole('link', { name: '7d' })).toHaveAttribute(
      'href',
      '/sepolia/vs/base/op-mainnet/7d'
    );
    // The default range keeps the two-segment path, prefix included.
    expect(screen.getByRole('link', { name: '24h' })).toHaveAttribute(
      'href',
      '/sepolia/vs/base/op-mainnet'
    );
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute(
      'href',
      '/sepolia'
    );
  });

  it('keeps a contender swap on the network being viewed', () => {
    onNetwork(NETWORKS.SEPOLIA);
    render(<VersusBattleCard aSlug="base" bSlug="op-mainnet" range="7d" />);

    fireEvent.change(screen.getByLabelText('Left contender'), {
      target: { value: 'arbitrum_one' },
    });

    expect(push).toHaveBeenCalledWith('/sepolia/vs/arbitrum-one/op-mainnet/7d', { scroll: false });
  });

  it('leaves a contender swap unprefixed on the default network', () => {
    render(<VersusBattleCard aSlug="base" bSlug="op-mainnet" range="7d" />);

    fireEvent.change(screen.getByLabelText('Right contender'), {
      target: { value: 'arbitrum_one' },
    });

    expect(push).toHaveBeenCalledWith('/vs/base/arbitrum-one/7d', { scroll: false });
  });

  it('reads the matchup from the network in the URL', () => {
    onNetwork(NETWORKS.SEPOLIA);
    render(<VersusBattleCard aSlug="base" bSlug="op-mainnet" range="24h" />);

    // The cache key names the network, so the sepolia page cannot be served
    // mainnet's shares.
    expect(vi.mocked(useApiData).mock.calls.at(-1)?.[1]).toEqual([
      'chart-attribution',
      'sepolia',
      '24h',
      50,
    ]);
    expect(screen.getByText(/on Sepolia\.$/)).toBeInTheDocument();
  });
});
