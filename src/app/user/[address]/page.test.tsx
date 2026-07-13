import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { UserResponse } from '@/types';
import UserDetailPage from './page';

const TEST_ADDRESS = '0x000000633b68f5D8D3a86593ebB815b4663BCBe0';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ address: TEST_ADDRESS })),
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function makeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    network_id: 1,
    address: TEST_ADDRESS,
    blob_count: 42,
    total_cost_eth: '0.5',
    last_timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// The page reads three queries through the same mocked hook; dispatch on the
// query key so the user fixture only answers the user query.
function mockApiData(user: UserResponse) {
  vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'user') {
      return { data: user, isLoading: false, error: null, refetch: vi.fn() };
    }
    return { data: [], isLoading: false, error: null, refetch: vi.fn() };
  });
}

describe('UserDetailPage attribution callout', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('offers a prefilled blob-list suggestion for unattributed users', () => {
    mockApiData(makeUser());
    render(<UserDetailPage />);

    const suggestLink = screen.getByRole('link', { name: /suggest an attribution/i });
    const href = suggestLink.getAttribute('href') ?? '';
    expect(href.startsWith('https://github.com/tirante-dev/blob-list/new/main?')).toBe(true);
    expect(new URL(href).searchParams.get('value')).toContain(
      `address: "${TEST_ADDRESS}"`
    );

    expect(
      screen.getByRole('link', { name: /how attribution works/i })
    ).toHaveAttribute(
      'href',
      'https://github.com/tirante-dev/blob-list/blob/main/CONTRIBUTING.md'
    );
  });

  it('hides the callout for attributed users', () => {
    mockApiData(makeUser({ name: 'Taiko' }));
    render(<UserDetailPage />);

    expect(
      screen.queryByRole('link', { name: /suggest an attribution/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/isn't attributed/)).not.toBeInTheDocument();
  });
});
