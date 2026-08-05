import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK, NETWORKS } from '@/constants';
import { useNetwork } from '@/hooks/useNetwork';
import NetworkLink from './NetworkLink';

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function onNetwork(network = DEFAULT_NETWORK) {
  vi.mocked(useNetwork).mockReturnValue({
    selectedNetwork: network,
    setSelectedNetwork: vi.fn(),
    networkOptions: [DEFAULT_NETWORK, NETWORKS.SEPOLIA],
    isNetworkKnown: true,
  });
}

describe('NetworkLink', () => {
  it('keeps in-app links on the network being viewed', () => {
    onNetwork(NETWORKS.SEPOLIA);
    render(<NetworkLink href="/block/123">Block</NetworkLink>);

    expect(screen.getByRole('link', { name: 'Block' })).toHaveAttribute(
      'href',
      '/sepolia/block/123'
    );
  });

  it('leaves the default network on the bare paths', () => {
    onNetwork();
    render(<NetworkLink href="/block/123">Block</NetworkLink>);

    expect(screen.getByRole('link', { name: 'Block' })).toHaveAttribute('href', '/block/123');
  });

  it('passes other props through to the underlying link', () => {
    onNetwork(NETWORKS.SEPOLIA);
    render(
      <NetworkLink href="/" className="nav" aria-current="page">
        Home
      </NetworkLink>
    );

    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/sepolia');
    expect(link).toHaveClass('nav');
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});
