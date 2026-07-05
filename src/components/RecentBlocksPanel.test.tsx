import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { BlobResponse, Block, LatestBlocksResponse } from '../types';
import RecentBlocksPanel from './RecentBlocksPanel';

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

function makeBlock(overrides: Partial<Block>): Block {
  return {
    id: 200,
    number: '200',
    blobCount: 1,
    blobGasUsed: 655360,
    blobGasTarget: 1835008,
    blobGasLimit: 2752512,
    targetBlobs: 14,
    maxBlobs: 21,
    availableBlobs: 20,
    baseFeeGwei: '1',
    utilizationPercent: 4.76,
    isFull: false,
    isAboveTarget: true,
    timestamp: '2026-01-01T00:00:00.000Z',
    attribution: ['Base'],
    blobs: [],
    ...overrides,
  };
}

function makeBlob(
  blockNumber: number,
  blobIndex: number,
  overrides: Partial<BlobResponse> = {}
): BlobResponse {
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
    ...overrides,
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

function makeLegacyNewBlockMessage(blockNumber: number, blob: BlobResponse): string {
  return JSON.stringify({
    type: 'new_block',
    data: {
      block_number: blockNumber,
      blob_count: 1,
      timestamp: blob.timestamp,
      blobs: [blob],
    },
  });
}

function renderRecentBlocksPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
        <RecentBlocksPanel />
      </LiveDataProvider>
    </QueryClientProvider>
  );
}

describe('RecentBlocksPanel', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('derives blob usage and target state from blob gas for matching labels and colors', () => {
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: {
        data: [
          makeBlock({ id: 200, number: '200' }),
          makeBlock({
            id: 201,
            number: '201',
            blobCount: 2,
            blobGasUsed: 2097152,
            availableBlobs: 19,
            utilizationPercent: 9.52,
            isAboveTarget: false,
          }),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderRecentBlocksPanel();

    expect(screen.getByText('5/21 blobs')).toBeInTheDocument();
    expect(screen.getByText('24%')).toBeInTheDocument();
    expect(screen.getByText('16/21 blobs')).toBeInTheDocument();
    expect(screen.getByText('76%')).toBeInTheDocument();

    const underTargetText = screen.getByText('Under target');
    expect(underTargetText).toHaveClass('text-green-400');
    const underTargetMeter = screen.getByRole('meter', { name: 'Under target' });
    expect(underTargetMeter).toHaveAttribute('aria-valuetext', 'Under target; target at 67%');
    expect(underTargetMeter.firstElementChild).toHaveClass('bg-green-400');
    expect(underTargetMeter.querySelector('[title="Target"]')).toHaveStyle({
      left: '66.66666666666666%',
    });

    const aboveTargetText = screen.getByText('Above target');
    expect(aboveTargetText).toHaveClass('text-amber-300');
    const aboveTargetMeter = screen.getByRole('meter', { name: 'Above target' });
    expect(aboveTargetMeter).toHaveAttribute('aria-valuetext', 'Above target; target at 67%');
    expect(aboveTargetMeter.firstElementChild).toHaveClass('bg-amber-300');
    expect(aboveTargetMeter.querySelector('[title="Target"]')).toHaveStyle({
      left: '66.66666666666666%',
    });
  });

  it('adds a target marker to legacy live blocks by reusing fetched capacity params', () => {
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: {
        data: [makeBlock({ id: 201, number: '201', blobGasUsed: 0, blobCount: 0 })],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderRecentBlocksPanel();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(
        makeLegacyNewBlockMessage(
          202,
          makeBlob(202, 0, {
            tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            timestamp: '2026-01-01T00:00:12.000Z',
            blob_gas_used: 655360,
          })
        )
      );
    });

    expect(screen.getByText('5/21 blobs')).toBeInTheDocument();
    const liveMeter = screen.getAllByRole('meter', { name: 'Under target' })[0];
    expect(liveMeter).toHaveAttribute('aria-valuetext', 'Under target; target at 67%');
    expect(liveMeter.querySelector('[title="Target"]')).toHaveStyle({
      left: '66.66666666666666%',
    });
  });

  it('builds a rolling recent block list from websocket events before REST data arrives', () => {
    renderRecentBlocksPanel();

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
    });

    expect(screen.getByRole('link', { name: 'View blob details for block 201' })).toHaveAttribute(
      'href',
      '/block/201'
    );

    act(() => {
      MockWebSocket.instances[0].receive(makeNewBlockMessage(202, 2));
    });

    expect(screen.getByRole('link', { name: 'View blob details for block 202' })).toHaveAttribute(
      'href',
      '/block/202'
    );
    expect(screen.getByRole('link', { name: 'View blob details for block 201' })).toBeInTheDocument();
    expect(screen.getByText('2/6 blobs')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.queryByText('Error loading data')).not.toBeInTheDocument();
  });

  it('fills gaps from a block_snapshot, including zero-blob blocks', () => {
    renderRecentBlocksPanel();

    // Live events arrive with a hole at 202 (e.g. missed while reconnecting).
    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 2));
    });

    expect(
      screen.queryByRole('link', { name: 'View blob details for block 202' })
    ).not.toBeInTheDocument();

    // The reconnect snapshot carries the recent blocks, newest first; 202 is
    // a zero-blob block that never had a live event of its own.
    const snapshot = JSON.stringify({
      type: 'block_snapshot',
      data: {
        blocks: [
          JSON.parse(makeNewBlockMessage(203, 2)).data,
          JSON.parse(makeNewBlockMessage(202, 0)).data,
          JSON.parse(makeNewBlockMessage(201, 1)).data,
        ],
      },
    });
    act(() => {
      MockWebSocket.instances[0].receive(snapshot);
    });

    for (const block of [201, 202, 203]) {
      expect(
        screen.getByRole('link', { name: `View blob details for block ${block}` })
      ).toBeInTheDocument();
    }
    // Zero-blob block renders with its pricing-derived capacity.
    expect(screen.getByText('0/6 blobs')).toBeInTheDocument();
  });
});
