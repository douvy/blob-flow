import React from 'react';
import { render, screen } from '@testing-library/react';
import { NETWORKS } from '../constants';
import { useNetwork } from '../hooks/useNetwork';
import AttributionBadge from './AttributionBadge';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function selectNetwork(network: (typeof NETWORKS)[string]) {
  vi.mocked(useNetwork).mockReturnValue({
    selectedNetwork: network,
    setSelectedNetwork: vi.fn(),
    networkOptions: Object.values(NETWORKS),
  });
}

describe('AttributionBadge', () => {
  beforeEach(() => {
    selectNetwork(NETWORKS.MAINNET);
  });

  it('ribbons registry testnet entities regardless of the selected network', () => {
    render(<AttributionBadge user="OP Sepolia Testnet" sizeClass="h-5 w-5" />);
    expect(screen.getByTitle('Sepolia testnet')).toHaveTextContent('Sepolia');
  });

  it('leaves known mainnet entities unribboned even on a testnet network', () => {
    selectNetwork(NETWORKS.SEPOLIA);
    render(<AttributionBadge user="Robinhood Chain" sizeClass="h-5 w-5" />);
    expect(screen.queryByTitle(/testnet/)).toBeNull();
  });

  it('ribbons unknown-sender placeholders with the selected testnet', () => {
    selectNetwork(NETWORKS.SEPOLIA);
    render(<AttributionBadge user="An Unknown Rollup" sizeClass="h-5 w-5" />);
    // Placeholder initial still renders alongside the ribbon.
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByTitle('Sepolia testnet')).toHaveTextContent('Sepolia');
  });

  it('leaves unknown-sender placeholders unribboned on mainnet', () => {
    render(<AttributionBadge user="An Unknown Rollup" sizeClass="h-5 w-5" />);
    expect(screen.queryByTitle(/testnet/)).toBeNull();
  });

  it('suppresses the ribbon when the caller overlays a shared one', () => {
    selectNetwork(NETWORKS.SEPOLIA);
    render(
      <AttributionBadge user="An Unknown Rollup" sizeClass="h-5 w-5" showTestnetLabel={false} />
    );
    expect(screen.queryByTitle(/testnet/)).toBeNull();
  });
});
