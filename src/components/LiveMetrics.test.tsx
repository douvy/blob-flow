import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import {
  BackendStatsWindowsResponse,
  BlobResponse,
  Block,
  LatestBlocksResponse,
  StatsResponse,
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

const statsFixture: StatsResponse = {
  data: {
    averageBaseFee: '1.00 Gwei',
    totalBlobs: 100000,
    totalConfirmedBlobs: 99000,
    pendingBlobsCount: 1200,
    avgBlobsPerBlock: 3.1,
    averageTip: '0.10 Gwei',
    averageTotalCost: '0.001 ETH',
    lastIndexedBlock: 200,
    lastIndexedTime: '2026-01-01T00:00:00.000Z',
  },
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

// LiveMetrics reads three queries through the same mocked hook; dispatch on
// the query key so each caller gets its own fixture.
function mockApiData(
  latestBlocks: LatestBlocksResponse | undefined,
  blocksError: Error | null = null
) {
  vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'stats') {
      return { data: statsFixture, isLoading: false, error: null, refetch: vi.fn() };
    }
    if (key === 'stats-windows') {
      return { data: statsWindowsFixture, isLoading: false, error: null, refetch: vi.fn() };
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

    expect(screen.getByText('Avg Base Fee (1h)')).toBeInTheDocument();
    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('Median 1.00 Gwei · p95 2.00 Gwei')).toBeInTheDocument();

    expect(screen.getByText('#200')).toBeInTheDocument();
    expect(screen.getByText(/^1\/6 blobs/)).toBeInTheDocument();

    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(screen.getByText('12 senders · 1h')).toBeInTheDocument();

    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('100% of last 2 blocks')).toBeInTheDocument();
  });

  it('folds every live block into the metrics sample, not just the newest', () => {
    renderLiveMetrics();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(202, 2));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 0));
    });

    expect(screen.getByText('#203')).toBeInTheDocument();
    expect(screen.getByText(/^0\/6 blobs/)).toBeInTheDocument();

    // The intermediate live blocks 201 and 202 stay in the Top User sample
    // alongside the two baseline blocks; only merging the newest event would
    // leave three.
    expect(screen.getByText('100% of last 5 blocks')).toBeInTheDocument();
  });

  it('applies stats_update events to the pending blobs metric', () => {
    renderLiveMetrics();

    expect(screen.getByText('1.2K')).toBeInTheDocument();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(
        JSON.stringify({
          type: 'stats_update',
          data: {
            total_blobs: 100500,
            total_confirmed_blobs: 99500,
            total_pending_blobs: 4200,
            average_base_fee: '1000000000',
            average_tip: '100000000',
            average_total_cost: '1000000000000000',
            last_indexed_block: 203,
            last_indexed_time: '2026-01-01T00:05:00.000Z',
          },
        })
      );
    });

    expect(screen.getByText('4.2K')).toBeInTheDocument();
    expect(screen.queryByText('1.2K')).not.toBeInTheDocument();
  });

  it('keeps headline cards and shows the footnote when the block sample fails', () => {
    mockApiData(undefined, new Error('sample fetch failed'));
    renderLiveMetrics();

    expect(screen.getByText('1.50 Gwei')).toBeInTheDocument();
    expect(screen.getByText('Waiting for next block')).toBeInTheDocument();
    expect(
      screen.getByText(/Latest Block and Top User data unavailable: sample fetch failed\.$/)
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
