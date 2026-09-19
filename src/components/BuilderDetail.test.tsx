import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import type {
  BackendBuilderDetailResponse,
  BackendBuilderStats,
  BackendBuilderUserRow,
} from '@/types';
import BuilderDetail from './BuilderDetail';
import { TooltipProvider } from './ui/tooltip';

const routerReplace = vi.fn();
const routerPush = vi.fn();
let searchParams: URLSearchParams;

const BUILDER_KEY = 'extra:titan-builder';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  usePathname: () => '/builder/extra%3Atitan-builder',
  useSearchParams: () => searchParams,
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

const ADDRESS_SENDER = '0x9999999999999999999999999999999999999999';

const builder: BackendBuilderStats = {
  key: BUILDER_KEY,
  name: 'Titan Builder',
  known: true,
  fee_recipients: ['0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97'],
  blocks: 1200,
  blob_blocks: 800,
  blobs: 3200,
  full_blocks: 120,
  block_share_percent: 32.5,
  blob_share_percent: 30.1,
  avg_blobs_per_blob_block: 4,
  mev_boost_blocks: 1100,
  proposer_payment_wei: {
    median: '50000000000000000',
    median_eth: '0.05',
    total: '6000000000000000000',
    total_eth: '6',
  },
  tip: {
    tx_count: 900,
    min: '100000000',
    min_gwei: '0.1',
    p10: '500000000',
    p10_gwei: '0.5',
    p50: '1500000000',
    p50_gwei: '1.5',
    p90: '4000000000',
    p90_gwei: '4',
  },
  time_to_inclusion_ms: { sample_count: 700, p50: 4200, p90: 15000 },
  candidates: {
    snapshot_blocks: 400,
    blocks_with_eligible_skipped: 40,
    eligible_skipped_txs: 60,
    eligible_skipped_blobs: 90,
    eligible_skipped_max_tip: '3000000000',
    eligible_skipped_max_tip_gwei: '3',
  },
};

const users: BackendBuilderUserRow[] = [
  {
    key: 'Base',
    name: 'Base',
    is_entity: true,
    blobs: 2000,
    tx_count: 500,
    share_within_builder_percent: 62.5,
    share_overall_percent: 26,
    inclusion_index: 2.4,
    tip_p50: '2000000000',
    tip_p50_gwei: '2',
    time_to_inclusion_ms: { sample_count: 480, p50: 3000 },
  },
  {
    key: ADDRESS_SENDER,
    is_entity: false,
    blobs: 900,
    tx_count: 300,
    share_within_builder_percent: 28.1,
    share_overall_percent: 93.6,
    inclusion_index: 0.3,
    tip_p50: '1000000000',
    tip_p50_gwei: '1',
    time_to_inclusion_ms: { sample_count: 120, p50: 9000 },
  },
  {
    key: 'Linea',
    name: 'Linea',
    is_entity: true,
    blobs: 300,
    tx_count: 100,
    share_within_builder_percent: 9.4,
    share_overall_percent: 0,
    inclusion_index: null,
    tip_p50: '3000000000',
    tip_p50_gwei: '3',
    time_to_inclusion_ms: { sample_count: 50, p50: 1000 },
  },
];

const detail: BackendBuilderDetailResponse = {
  chain_id: 1,
  network_name: 'mainnet',
  range: '24h',
  window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
  totals: { blocks: 3700, blob_blocks: 2400, blobs: 10600 },
  generated_at: '2026-01-02T00:00:00.000Z',
  builders: [builder],
  builder,
  users,
  skipped: [
    {
      key: 'Base',
      name: 'Base',
      is_entity: true,
      txs: 12,
      blobs: 18,
      max_tip: '5000000000',
      max_tip_gwei: '5',
      p50_tip: '2000000000',
      p50_tip_gwei: '2',
    },
  ],
  recent_blocks: [
    {
      number: 21000000,
      timestamp: '2026-01-01T23:59:00.000Z',
      blob_count: 6,
      blob_params_max: 9,
      proposer_payment_wei: '30000000000000000',
      candidate_snapshot: true,
      eligible_skipped_txs: 2,
      eligible_skipped_max_tip: '3000000000',
    },
    {
      number: 20999999,
      timestamp: '2026-01-01T23:58:00.000Z',
      blob_count: 3,
      candidate_snapshot: false,
    },
  ],
};

function renderDetail() {
  return render(
    <TooltipProvider>
      <BuilderDetail builderKey={BUILDER_KEY} />
    </TooltipProvider>
  );
}

function mockData(data: BackendBuilderDetailResponse | null) {
  vi.mocked(useApiData<BackendBuilderDetailResponse | null>).mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  });
}

/** The table row holding a sender or block, for per-row assertions. */
function rowFor(text: string | RegExp): HTMLElement {
  const cell = screen.getByText(text).closest('tr');
  if (!cell) throw new Error(`no row for ${String(text)}`);
  return cell as HTMLElement;
}

describe('BuilderDetail', () => {
  beforeEach(() => {
    routerReplace.mockReset();
    routerPush.mockReset();
    searchParams = new URLSearchParams();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
      networkSegment: null,
    });
    mockData(detail);
  });

  it('renders the builder name and its aggregate cards', () => {
    renderDetail();

    expect(screen.getByRole('heading', { level: 1, name: 'Titan Builder' })).toBeInTheDocument();
    expect(screen.getByText(new Intl.NumberFormat().format(1200))).toBeInTheDocument();
    expect(screen.getByText(/32\.5% of attributed blocks/)).toBeInTheDocument();
    expect(screen.getByText(/30\.1% of attributed blobs/)).toBeInTheDocument();
    // The median payment reads in ETH, and the tip band shows all three marks.
    expect(screen.getByText('0.05 ETH')).toBeInTheDocument();
    expect(screen.getByText(/0\.5 Gwei · 1\.5 Gwei · 4 Gwei/)).toBeInTheDocument();
    expect(screen.getByText(/60 txs/)).toBeInTheDocument();
  });

  it('defaults to the 24h window and refetches on the builder key', () => {
    renderDetail();

    const queryKey = vi.mocked(useApiData).mock.calls.at(-1)?.[1] as unknown[];
    expect(queryKey).toEqual(['builder', 'mainnet', BUILDER_KEY, '24h']);
  });

  it('opens on the window a shared link carries', () => {
    searchParams = new URLSearchParams('range=7d');
    renderDetail();

    const queryKey = vi.mocked(useApiData).mock.calls.at(-1)?.[1] as unknown[];
    expect(queryKey).toContain('7d');
  });

  it('rewrites the query string when a window pill is clicked', () => {
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: '7d' }));

    expect(routerReplace).toHaveBeenCalledWith(
      '/builder/extra%3Atitan-builder?range=7d',
      { scroll: false }
    );
  });

  it('reports a missing candidate snapshot rather than zero skipped', () => {
    mockData({
      ...detail,
      builder: { ...builder, candidates: null },
      skipped: [],
    });
    renderDetail();

    expect(screen.getByText('No snapshot')).toBeInTheDocument();
    expect(screen.getByText(/No candidate snapshot exists for this builder/)).toBeInTheDocument();
    // The skipped table is not rendered at all, so its columns are absent.
    expect(screen.queryByRole('columnheader', { name: 'Txs' })).not.toBeInTheDocument();
  });

  it('renders the skipped table when a snapshot exists', () => {
    renderDetail();

    expect(screen.getByRole('columnheader', { name: 'Txs' })).toBeInTheDocument();
    expect(screen.getByText(/never proof/)).toBeInTheDocument();
  });

  it('tones the inclusion index by how far it sits from neutral', () => {
    renderDetail();

    expect(screen.getByText('2.40x')).toHaveClass('text-green');
    expect(screen.getByText('favored')).toBeInTheDocument();
    expect(screen.getByText('0.30x')).toHaveClass('text-[#ff8f8f]');
    expect(screen.getByText('under-included')).toBeInTheDocument();
    // A sender with no overall share has no index to compare against.
    expect(within(rowFor('Linea')).getByText('-')).toBeInTheDocument();
  });

  it('links entity senders to the entity page and addresses to the user page', () => {
    renderDetail();

    const entityRow = rowFor('2.40x');
    expect(within(entityRow).getByRole('link', { name: 'Base' })).toHaveAttribute(
      'href',
      '/entity/base'
    );

    const addressRow = rowFor('0.30x');
    expect(within(addressRow).getByRole('link', { name: '0x9999...9999' })).toHaveAttribute(
      'href',
      `/user/${ADDRESS_SENDER}`
    );
  });

  it('links recent blocks and marks the ones with no snapshot', () => {
    renderDetail();

    const blockNumber = new Intl.NumberFormat().format(21000000);
    expect(screen.getByRole('link', { name: blockNumber })).toHaveAttribute(
      'href',
      '/block/21000000'
    );

    const unsnapshotted = rowFor(new Intl.NumberFormat().format(20999999));
    expect(within(unsnapshotted).getByText('no snapshot')).toBeInTheDocument();
  });

  it('offers a wider range when the builder built nothing in the window', () => {
    mockData(null);
    renderDetail();

    expect(screen.getByText(/built no blocks on Mainnet in the last 24 hours/)).toBeInTheDocument();
    expect(screen.getByText(/Try a wider range/)).toBeInTheDocument();
    // The pills stay on screen: widening the window is the way out of this.
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Sender' })).not.toBeInTheDocument();
  });

  it('flags a builder the registry does not know', () => {
    mockData({ ...detail, builder: { ...builder, known: false } });
    renderDetail();

    expect(screen.getByText('Unregistered builder')).toBeInTheDocument();
  });
});
