import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import type { BackendBuilderShareChartResponse } from '@/types';
import BuilderShareSection from './BuilderShareSection';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/builders',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useApiData', () => ({ useApiData: vi.fn() }));
vi.mock('@/hooks/useNetwork', () => ({ useNetwork: vi.fn() }));

const data: BackendBuilderShareChartResponse = {
  chain_id: 1,
  network_name: 'mainnet',
  range: '24h',
  granularity: 'hour',
  bucket_seconds: 3600,
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-01T01:00:00Z',
  generated_at: '2026-01-01T01:00:05Z',
  series: [{ key: 'titan', name: 'Titan Builder', known: true }],
  points: [
    {
      timestamp: '2026-01-01T00:00:00Z',
      blocks: 10,
      blobs: 20,
      values: { titan: { blocks: 10, blobs: 20 } },
    },
  ],
  summary: {
    total_blocks: 10,
    total_blobs: 20,
    shares: [
      {
        key: 'titan',
        name: 'Titan Builder',
        known: true,
        blocks: 10,
        blobs: 20,
        block_share_percent: 100,
        blob_share_percent: 100,
      },
    ],
  },
};

describe('BuilderShareSection', () => {
  beforeEach(() => {
    vi.mocked(useApiData).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<BackendBuilderShareChartResponse>).mockReturnValue({
      data,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders the card, the toggles, and the summary', () => {
    render(<BuilderShareSection />);

    expect(screen.getByText('Builder share over the last 24 hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blocks' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Titan Builder 100.0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute('aria-pressed', 'true');
  });
});
