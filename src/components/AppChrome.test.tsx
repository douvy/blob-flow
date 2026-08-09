import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import AppChrome, { isChromelessRoute } from './AppChrome';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

vi.mock('./Header', () => ({
  default: () => <header data-testid="site-header" />,
}));

vi.mock('./IndexerStatusBanner', () => ({
  default: () => <div data-testid="indexer-banner" />,
}));

vi.mock('./Footer', () => ({
  default: () => <footer data-testid="site-footer" />,
}));

describe('isChromelessRoute', () => {
  it('covers the kiosk route and anything nested under it', () => {
    expect(isChromelessRoute('/live')).toBe(true);
    expect(isChromelessRoute('/live/mainnet')).toBe(true);
  });

  it('covers the network-scoped copies of the kiosk', () => {
    expect(isChromelessRoute('/sepolia/live')).toBe(true);
    // Any served segment, including one absent from the fallback network list.
    expect(isChromelessRoute('/some-new-chain/live')).toBe(true);
  });

  it('does not match ordinary routes or lookalike prefixes', () => {
    expect(isChromelessRoute('/')).toBe(false);
    expect(isChromelessRoute('/blocks')).toBe(false);
    expect(isChromelessRoute('/livestream')).toBe(false);
    expect(isChromelessRoute('/sepolia/blocks')).toBe(false);
    expect(isChromelessRoute('/sepolia/livestream')).toBe(false);
    expect(isChromelessRoute(null)).toBe(false);
  });
});

describe('AppChrome', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReset();
  });

  it('frames ordinary pages with the header, banner, and footer', () => {
    vi.mocked(usePathname).mockReturnValue('/blocks');

    render(
      <AppChrome>
        <p>page body</p>
      </AppChrome>
    );

    expect(screen.getByTestId('site-header')).toBeInTheDocument();
    expect(screen.getByTestId('indexer-banner')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('renders the kiosk route bare so it owns the whole viewport', () => {
    vi.mocked(usePathname).mockReturnValue('/live');

    render(
      <AppChrome>
        <p>kiosk body</p>
      </AppChrome>
    );

    expect(screen.queryByTestId('site-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('indexer-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('site-footer')).not.toBeInTheDocument();
    expect(screen.getByText('kiosk body')).toBeInTheDocument();
  });
});
