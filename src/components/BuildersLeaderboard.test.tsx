import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { trackEvent } from '@/lib/analytics';
import type {
  BackendBuilderStats,
  BackendBuildersResponse,
} from '@/types';
import { networkPath } from '@/utils';
import BuildersLeaderboard from './BuildersLeaderboard';
import { TooltipProvider } from './ui/tooltip';

const routerPush = vi.fn();
const routerReplace = vi.fn();
let searchParams: URLSearchParams;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  usePathname: () => '/builders',
  useSearchParams: () => searchParams,
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

function makeBuilder(overrides: Partial<BackendBuilderStats>): BackendBuilderStats {
  return {
    key: 'titan',
    name: 'Titan Builder',
    known: true,
    fee_recipients: ['0x1111111111111111111111111111111111111111'],
    blocks: 600,
    blob_blocks: 400,
    blobs: 1200,
    full_blocks: 20,
    block_share_percent: 60,
    blob_share_percent: 55.5,
    avg_blobs_per_blob_block: 3,
    mev_boost_blocks: 590,
    proposer_payment_wei: null,
    tip: {
      tx_count: 400,
      min: '1',
      min_gwei: '0.001',
      p10: '1',
      p10_gwei: '0.0011',
      p50: '2',
      p50_gwei: '0.0025',
      p90: '3',
      p90_gwei: '0.0125',
    },
    time_to_inclusion_ms: { sample_count: 320, p50: 6200, p90: 18000 },
    candidates: {
      snapshot_blocks: 210,
      blocks_with_eligible_skipped: 14,
      eligible_skipped_txs: 19,
      eligible_skipped_blobs: 25,
    },
    ...overrides,
  };
}

const response: BackendBuildersResponse = {
  chain_id: 1,
  range: '24h',
  window: { from: '2026-01-01T00:00:00Z', to: '2026-01-02T00:00:00Z' },
  totals: { blocks: 1000, blob_blocks: 700, blobs: 2200 },
  generated_at: '2026-01-02T00:00:05Z',
  builders: [
    makeBuilder({}),
    makeBuilder({
      key: 'extra:beaver',
      name: 'beaverbuild',
      known: false,
      blocks: 300,
      blob_blocks: 200,
      blobs: 800,
      block_share_percent: 30,
      blob_share_percent: 36.4,
      avg_blobs_per_blob_block: 4,
      mev_boost_blocks: 0,
      tip: null,
      time_to_inclusion_ms: null,
      candidates: null,
    }),
  ],
};

function renderLeaderboard() {
  return render(
    <TooltipProvider>
      <BuildersLeaderboard />
    </TooltipProvider>
  );
}

/** The query key the most recent fetch subscribed with. */
function lastQueryKey(): unknown[] {
  return vi.mocked(useApiData).mock.calls.at(-1)?.[1] as unknown[];
}

function mockData(data: BackendBuildersResponse | undefined) {
  vi.mocked(useApiData<BackendBuildersResponse>).mockReturnValue({
    data: data as BackendBuildersResponse,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('BuildersLeaderboard', () => {
  beforeEach(() => {
    // The repo's setup never clears module mock call counts between tests.
    routerPush.mockReset();
    routerReplace.mockReset();
    vi.mocked(trackEvent).mockReset();
    vi.mocked(useApiData).mockReset();
    searchParams = new URLSearchParams();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    mockData(response);
  });

  it('renders each builder with its rank, counts, and shares', () => {
    renderLeaderboard();

    expect(screen.getByText('Titan Builder')).toBeInTheDocument();
    expect(screen.getByText('beaverbuild')).toBeInTheDocument();
    // Rank comes from the server order.
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('55.5%')).toBeInTheDocument();
    expect(screen.getByText('3.0 avg/blob block')).toBeInTheDocument();
    expect(screen.getByText('590 via MEV-Boost')).toBeInTheDocument();
  });

  it('summarizes the window without claiming it is the whole network', () => {
    renderLeaderboard();

    expect(
      screen.getByText(
        '1,000 blocks (700 with blobs), 2,200 blobs attributed over the last 24 hours'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/only exists for blocks indexed since/i)).toBeInTheDocument();
  });

  it('defaults to the 24h window', () => {
    renderLeaderboard();

    expect(lastQueryKey()).toEqual(['builders', DEFAULT_NETWORK.apiParam, '24h']);
  });

  it('opens on the window a shared link carries', () => {
    searchParams = new URLSearchParams('range=7d');

    renderLeaderboard();

    expect(lastQueryKey()).toContain('7d');
  });

  it('rewrites the URL and tracks the switch when a window is picked', () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole('button', { name: '7d' }));

    expect(routerReplace).toHaveBeenCalledWith('/builders?range=7d', { scroll: false });
    expect(trackEvent).toHaveBeenCalledWith('time-range-change', {
      range: '7d',
      previous: '24h',
    });
  });

  it('renders the tip band and a dash when a builder has no tips', () => {
    renderLeaderboard();

    expect(screen.getByText('0.0011 · 0.0025 · 0.0125 Gwei')).toBeInTheDocument();
    // The second builder has neither a tip band nor an inclusion sample.
    expect(screen.getAllByText('-')).toHaveLength(2);
  });

  it('renders the median time to inclusion with its p90 and sample count', () => {
    renderLeaderboard();

    expect(screen.getByText('6.2s')).toBeInTheDocument();
    expect(screen.getByText('p90 18.0s, 320 samples')).toBeInTheDocument();
  });

  it('marks a missing candidate snapshot as no measurement rather than zero', () => {
    renderLeaderboard();

    const beaverRow = screen.getByRole('link', { name: 'View builder stats for beaverbuild' });
    expect(within(beaverRow).getByText('no snapshot')).toBeInTheDocument();
    expect(within(beaverRow).queryByText('0')).not.toBeInTheDocument();

    const titanRow = screen.getByRole('link', { name: 'View builder stats for Titan Builder' });
    expect(within(titanRow).getByText('19')).toBeInTheDocument();
    expect(within(titanRow).getByText('of 210 snapshot blocks')).toBeInTheDocument();
  });

  it('hints that a derived builder key is not a registered builder', () => {
    renderLeaderboard();

    const beaverRow = screen.getByRole('link', { name: 'View builder stats for beaverbuild' });
    expect(within(beaverRow).getByText('unregistered')).toBeInTheDocument();

    const titanRow = screen.getByRole('link', { name: 'View builder stats for Titan Builder' });
    expect(within(titanRow).queryByText('unregistered')).not.toBeInTheDocument();
  });

  it('opens the builder page when a row is clicked, encoding the key', () => {
    renderLeaderboard();

    fireEvent.click(screen.getByRole('link', { name: 'View builder stats for beaverbuild' }));

    expect(routerPush).toHaveBeenCalledWith(
      networkPath('/builder/extra%3Abeaver', DEFAULT_NETWORK.apiParam)
    );
  });

  it('opens the builder page from the keyboard', () => {
    renderLeaderboard();

    fireEvent.keyDown(screen.getByRole('link', { name: 'View builder stats for Titan Builder' }), {
      key: 'Enter',
    });

    expect(routerPush).toHaveBeenCalledWith(
      networkPath('/builder/titan', DEFAULT_NETWORK.apiParam)
    );
  });

  it('shows an empty state when the window has no builders', () => {
    mockData({ ...response, builders: [], totals: { blocks: 0, blob_blocks: 0, blobs: 0 } });

    renderLeaderboard();

    expect(screen.getByText('No builder data in this window.')).toBeInTheDocument();
  });
});
