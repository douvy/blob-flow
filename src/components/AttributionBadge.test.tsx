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

/** The hairline outline overlay, which carries no other role or text. */
function outline(container: HTMLElement) {
  return container.querySelector('span[aria-hidden="true"]');
}

describe('AttributionBadge', () => {
  beforeEach(() => {
    selectNetwork(NETWORKS.MAINNET);
  });

  it('outlines every entity logo so opaque dark marks still have an edge', () => {
    // Shape's logo is a solid black disc; nothing but an outline separates
    // it from the page background.
    const { container } = render(<AttributionBadge user="Shape" sizeClass="h-5 w-5" />);
    expect(outline(container)).toHaveClass('ring-1', 'ring-inset', 'ring-white/12', 'rounded-full');
  });

  it('backs a dark logo that leaves its circle see-through', () => {
    const { container } = render(<AttributionBadge user="Linea" sizeClass="h-5 w-5" />);
    expect(container.querySelector('img')).toHaveClass('bg-white/90');
  });

  it('leaves an opaque dark logo unbacked, since a backdrop cannot show through', () => {
    const { container } = render(<AttributionBadge user="Shape" sizeClass="h-5 w-5" />);
    expect(container.querySelector('img')).not.toHaveClass('bg-white/90');
  });

  it('leaves legible logos untouched apart from the outline', () => {
    const { container } = render(<AttributionBadge user="Base" sizeClass="h-5 w-5" />);
    expect(container.querySelector('img')).not.toHaveClass('bg-white/90');
    expect(outline(container)).not.toBeNull();
  });

  it('backs a testnet logo and keeps its ribbon on top', () => {
    const { container } = render(<AttributionBadge user="Linea Sepolia" sizeClass="h-5 w-5" />);
    expect(container.querySelector('img')).toHaveClass('bg-white/90');
    expect(screen.getByTitle('Sepolia testnet')).toHaveTextContent('Sepolia');
  });

  it('leaves the unknown-sender placeholder on its grey disc, with no outline', () => {
    const { container } = render(<AttributionBadge user="An Unknown Rollup" sizeClass="h-5 w-5" />);
    expect(screen.getByText('A')).toHaveClass('bg-gray-500');
    expect(outline(container)).toBeNull();
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
