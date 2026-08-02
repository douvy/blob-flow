import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import {
  BackendStatsWindowsResponse,
  BackendUsersRange,
  BlobResponse,
  Block,
  LatestBlocksResponse,
  MempoolPressure,
  TopUsersResponse,
} from '../types';
import LiveMetrics from './LiveMetrics';

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send() {}

  close() {
    this.readyState = 3;
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

const pressureFixture: MempoolPressure = {
  networkId: 1,
  networkName: 'mainnet',
  pendingBlobCount: 1200,
  pendingBlobGas: 1200 * 131072,
  pendingUniqueSenders: 12,
  feeDistribution: {
    min: '1.00',
    avg: '1.50',
    median: '1.25',
    p95: '2.00',
    max: '2.50',
  },
  pendingTransactionAge: {
    oldest: '2m',
    newest: '5s',
    average: '1m',
    oldestSeconds: 120,
    newestSeconds: 5,
    averageSeconds: 60,
    oldestTimestamp: '2026-01-01T00:00:00.000Z',
    newestTimestamp: '2026-01-01T00:01:55.000Z',
  },
  includability: {
    latestBlobBaseFee: '1.00',
    pricingAvailable: true,
    likelyIncludableCount: 1180,
    underpricedCount: 20,
    unknownPricingCount: 0,
  },
  sampleLimit: 50,
  sampleTruncated: false,
  generatedAt: '2026-01-01T00:02:00.000Z',
};

const topUsersFixture: TopUsersResponse = {
  data: [
    {
      id: 1,
      name: 'Base',
      address: '0x2222222222222222222222222222222222222222',
      attributed: true,
      dataCount: 1200,
      percentage: 48.2,
      totalCostEth: '0.5',
      lastTimestamp: '2026-01-01T00:00:10.000Z',
    },
    {
      id: 2,
      name: 'Arbitrum',
      address: '0x1111111111111111111111111111111111111111',
      attributed: true,
      dataCount: 800,
      percentage: 32.1,
      totalCostEth: '0.3',
      lastTimestamp: '2026-01-01T00:00:00.000Z',
    },
  ],
  hasServerShares: true,
};

const statsWindowsFixture: BackendStatsWindowsResponse = {
  network_id: 1,
  network_name: 'mainnet',
  generated_at: '2026-01-01T01:00:00.000Z',
  windows: [
    {
      window: '1h',
      duration_seconds: 3600,
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-01T01:00:00.000Z',
      average_blob_base_fee_wei: '1500000000',
      median_blob_base_fee_wei: '1000000000',
      p95_blob_base_fee_wei: '2000000000',
      total_blobs: 120,
      total_blob_gas_used: 15728640,
      average_utilization: '0.5',
      total_cost_wei: '1000000000000000',
      unique_senders: 12,
    },
  ],
};

function makeBlob(blockNumber: number, blobIndex: number): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: blockNumber,
    blob_index: blobIndex,
    tx_hash: `0x${blockNumber.toString(16).padStart(64, '0')}${blobIndex}`,
    from_address: '0x1234567890abcdef1234567890abcdef12345678',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '1000000000',
    base_fee_per_blob_gas_gwei: '1',
    tip_per_blob_gas: '0',
    total_cost_eth: '0.001',
    timestamp: `2026-01-01T00:00:0${blobIndex}.000Z`,
    confirmed: true,
    user_attribution: 'Base',
    blob_gas_used: 131072,
  };
}

function makeRestBlock(blockNumber: number, blobCount: number): Block {
  return {
    id: blockNumber,
    number: blockNumber.toString(),
    blobCount,
    blobGasUsed: blobCount * 131072,
    blobGasTarget: 393216,
    blobGasLimit: 786432,
    targetBlobs: 3,
    maxBlobs: 6,
    availableBlobs: 6 - blobCount,
    baseFeeGwei: '1',
    utilizationPercent: (blobCount / 6) * 100,
    isFull: false,
    isAboveTarget: blobCount > 3,
    timestamp: '2026-01-01T00:00:00.000Z',
    attribution: blobCount > 0 ? ['Base'] : [],
    blobs: Array.from({ length: blobCount }, (_, index) => makeBlob(blockNumber, index)),
  };
}

function makeNewBlockMessage(blockNumber: number, blobCount: number): string {
  return JSON.stringify({
    type: 'new_block',
    data: {
      block_number: blockNumber,
      blob_count: blobCount,
      timestamp: '2026-01-01T00:00:00.000Z',
      blobs: Array.from({ length: blobCount }, (_, index) => makeBlob(blockNumber, index)),
      pricing: {
        block_number: blockNumber,
        block_timestamp: '2026-01-01T00:00:00.000Z',
        blob_count: blobCount,
        blob_gas_used: blobCount * 131072,
        blob_gas_target: 393216,
        blob_gas_limit: 786432,
        excess_blob_gas: 0,
        blob_base_fee: '250000000',
        blob_base_fee_gwei: '0.25',
        utilization_ratio: (blobCount / 6).toString(),
        blob_params_target: 3,
        blob_params_max: 6,
        target_blobs: 3,
        max_blobs: 6,
        available_blobs: 6 - blobCount,
        utilization_percent: (blobCount / 6) * 100,
        is_full: blobCount === 6,
        is_above_target: blobCount > 3,
        update_fraction: 3338477,
      },
    },
  });
}

function makeUsersUpdateMessage(range: BackendUsersRange): string {
  return JSON.stringify({
    type: 'users_update',
    range,
    data: [
      {
        network_id: 1,
        address: '0x3333333333333333333333333333333333333333',
        name: 'Optimism',
        blob_count: 900,
        total_cost_eth: '0.9',
        last_timestamp: '2026-01-01T00:01:00.000Z',
        blob_share_percent: 45,
      },
    ],
  });
}

// LiveMetrics reads four queries through the same mocked hook; dispatch on
// the query key so each caller gets its own fixture.
function mockApiData(
  latestBlocks: LatestBlocksResponse | undefined,
  blocksError: Error | null = null,
  pressure: MempoolPressure | null = pressureFixture,
  pressureError: Error | null = null,
  topUsers: TopUsersResponse | null = topUsersFixture,
  topUsersError: Error | null = null
) {
  vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'mempool-pressure') {
      return {
        data: pressure ?? undefined,
        isLoading: false,
        error: pressureError,
        refetch: vi.fn(),
      };
    }
    if (key === 'stats-windows') {
      return { data: statsWindowsFixture, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (key === 'top-users') {
      return {
        data: topUsers ?? undefined,
        isLoading: false,
        error: topUsersError,
        refetch: vi.fn(),
      };
    }
    return { data: latestBlocks, isLoading: false, error: blocksError, refetch: vi.fn() };
  });
}

function renderLiveMetrics() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
        <LiveMetrics />
      </LiveDataProvider>
    </QueryClientProvider>
  );
}

describe('LiveMetrics', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    mockApiData({ data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] });
  });

  it('renders the metric cards from the REST baseline and rolling window', () => {
    renderLiveMetrics();

    // The sample must come from the shared latest-blocks cache entry, not a
    // component-private key.
    expect(vi.mocked(useApiData)).toHaveBeenCalledWith(
      expect.any(Function),
      ['latest-blocks', DEFAULT_NETWORK.apiParam, 30]
    );

    // Pending Blobs must read the shared pressure cache entry (the same key
    // the hero and /mempool use), so the homepage shows one snapshot.
    expect(vi.mocked(useApiData)).toHaveBeenCalledWith(
      expect.any(Function),
      ['mempool-pressure', DEFAULT_NETWORK.apiParam],
      expect.objectContaining({ refetchInterval: expect.any(Number) })
    );

    // Top User must read the same range-scoped cache entry as the Top Blob
    // Users table, so the card matches the table for the selected filter.
    expect(vi.mocked(useApiData)).toHaveBeenCalledWith(
      expect.any(Function),
      ['top-users', DEFAULT_NETWORK.apiParam, 10, '1h']
    );

    expect(screen.getByText('Avg Base Fee (1h)')).toBeInTheDocument();
    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('Median 1.00 Gwei · p95 2.00 Gwei')).toBeInTheDocument();

    expect(screen.getByText('#200')).toBeInTheDocument();
    expect(screen.getByText(/^1\/6 blobs/)).toBeInTheDocument();

    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(screen.getByText('12 senders · public mempool')).toBeInTheDocument();

    expect(screen.getByText('Top User (1h)')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('1.2K blobs · 48.2% of total')).toBeInTheDocument();
  });

  it('folds every live block into the Latest Block card, not just the newest', () => {
    renderLiveMetrics();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(202, 2));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 0));
    });

    expect(screen.getByText('#203')).toBeInTheDocument();
    expect(screen.getByText(/^0\/6 blobs/)).toBeInTheDocument();
  });

  it('applies users_update events scoped to the selected range to the Top User card', () => {
    renderLiveMetrics();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeUsersUpdateMessage('24h'));
    });

    // Scoped to a different window than the selected 1h filter: ignored.
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.queryByText('Optimism')).not.toBeInTheDocument();

    act(() => {
      MockWebSocket.instances[0].receive(makeUsersUpdateMessage('1h'));
    });

    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.getByText('900 blobs · 45% of total')).toBeInTheDocument();
  });

  it('discloses a failed pressure refetch instead of presenting the stale count as current', () => {
    mockApiData(
      { data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] },
      null,
      pressureFixture,
      new Error('pressure refetch failed')
    );
    renderLiveMetrics();

    // React Query keeps the last snapshot on error; the hero renders the same
    // cache entry, so the value stays visible but the staleness is labeled.
    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(
      screen.getByText('12 senders · public mempool · refresh failed')
    ).toBeInTheDocument();
  });

  it('degrades the pending blobs card instead of the whole section when pressure is unavailable', () => {
    mockApiData({ data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] }, null, null);
    renderLiveMetrics();

    expect(screen.getByText('Pending Blobs')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('public mempool')).toBeInTheDocument();

    // The headline cards keep rendering from the rolling window.
    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('#200')).toBeInTheDocument();
  });

  it('labels local fallback shares as top-N instead of claiming a share of all blobs', () => {
    mockApiData(
      { data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] },
      null,
      pressureFixture,
      null,
      { data: topUsersFixture.data, hasServerShares: false }
    );
    renderLiveMetrics();

    // The fallback denominator is only the returned rows, so "of total"
    // would overstate the share.
    expect(screen.getByText('1.2K blobs · 48.2% of top 10')).toBeInTheDocument();
  });

  it('drops the refresh-failed label when a live snapshot newer than the failure arrives', () => {
    mockApiData(
      { data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] },
      null,
      pressureFixture,
      null,
      topUsersFixture,
      new Error('users refresh failed')
    );
    renderLiveMetrics();

    expect(screen.getByText('1.2K blobs · 48.2% of total · refresh failed')).toBeInTheDocument();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeUsersUpdateMessage('1h'));
    });

    // The snapshot is fresher than the failed fetch, so the staleness label
    // would misdescribe the rows on screen.
    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.getByText('900 blobs · 45% of total')).toBeInTheDocument();
    expect(screen.queryByText(/refresh failed/)).not.toBeInTheDocument();
  });

  it('shows a loading description while an uncached window is fetching', () => {
    vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === 'mempool-pressure') {
        return { data: pressureFixture, isLoading: false, error: null, refetch: vi.fn() };
      }
      if (key === 'stats-windows') {
        return { data: statsWindowsFixture, isLoading: false, error: null, refetch: vi.fn() };
      }
      if (key === 'top-users') {
        return { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
      }
      return {
        data: { data: [makeRestBlock(200, 1)] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    renderLiveMetrics();

    // A range switch keys a fresh query; while it runs the card must not
    // claim there is no data for the window.
    expect(screen.getByText('Loading window data')).toBeInTheDocument();
    expect(screen.queryByText('No user data yet')).not.toBeInTheDocument();
  });

  it('degrades the Top User card instead of the whole section when users are unavailable', () => {
    mockApiData(
      { data: [makeRestBlock(200, 1), makeRestBlock(199, 2)] },
      null,
      pressureFixture,
      null,
      null,
      new Error('users fetch failed')
    );
    renderLiveMetrics();

    expect(screen.getByText('Top User (1h)')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('User data unavailable')).toBeInTheDocument();

    // The headline cards keep rendering from the rolling window.
    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('#200')).toBeInTheDocument();
  });

  it('keeps headline cards and shows the footnote when the block sample fails', () => {
    mockApiData(undefined, new Error('sample fetch failed'));
    renderLiveMetrics();

    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('Waiting for next block')).toBeInTheDocument();
    expect(
      screen.getByText(/Latest Block data unavailable: sample fetch failed\.$/)
    ).toBeInTheDocument();

    // Live blocks still fill the sample, and the footnote stops implying a
    // successful REST fetch ever happened.
    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
    });

    expect(screen.getByText('#201')).toBeInTheDocument();
    expect(
      screen.getByText(/sample fetch failed\. Showing the most recent blocks available\./)
    ).toBeInTheDocument();
  });
});
