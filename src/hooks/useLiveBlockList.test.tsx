import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { useApiData } from './useApiData';
import { useNetwork } from './useNetwork';
import { BlobResponse, Block, LatestBlocksResponse } from '../types';
import { useLiveBlockList } from './useLiveBlockList';

vi.mock('./useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('./useNetwork', () => ({
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

function makeBlock(blockNumber: number, blobCount = 1): Block {
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
    blobs: [],
  };
}

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

function makeNewBlockData(blockNumber: number, blobCount: number) {
  return {
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
  };
}

function makeNewBlockMessage(blockNumber: number, blobCount: number): string {
  return JSON.stringify({ type: 'new_block', data: makeNewBlockData(blockNumber, blobCount) });
}

function Probe({ limit }: { limit: number }) {
  const { blocks } = useLiveBlockList(limit);
  return (
    <ul>
      {blocks.map((block) => (
        <li key={block.id} data-testid="block">
          {`${block.number}:${block.blobCount}:${block.maxBlobs}`}
        </li>
      ))}
    </ul>
  );
}

function renderProbe(limit: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
        <Probe limit={limit} />
      </LiveDataProvider>
    </QueryClientProvider>
  );
}

function renderedBlocks(): string[] {
  return screen.queryAllByTestId('block').map((element) => element.textContent ?? '');
}

describe('useLiveBlockList', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: { data: [makeBlock(200), makeBlock(199, 2)] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('accumulates every new_block event over the REST baseline', () => {
    renderProbe(10);

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(202, 2));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 0));
    });

    // Every live block is kept, not just the newest; zero-blob blocks render
    // with their pricing-derived capacity.
    expect(renderedBlocks()).toEqual([
      '203:0:6',
      '202:2:6',
      '201:1:6',
      '200:1:6',
      '199:2:6',
    ]);
  });

  it('prefers the live block over a fetched block with the same number', () => {
    renderProbe(10);

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(200, 4));
    });

    expect(renderedBlocks()).toEqual(['200:4:6', '199:2:6']);
  });

  it('keeps only the newest `limit` blocks', () => {
    renderProbe(2);

    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(202, 2));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 3));
    });

    expect(renderedBlocks()).toEqual(['203:3:6', '202:2:6']);
  });

  it('fills gaps from a block_snapshot', () => {
    renderProbe(10);

    // Live events arrive with a hole at 202 (e.g. missed while reconnecting).
    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeNewBlockMessage(201, 1));
      MockWebSocket.instances[0].receive(makeNewBlockMessage(203, 2));
    });

    expect(renderedBlocks()).not.toContain('202:0:6');

    const snapshot = JSON.stringify({
      type: 'block_snapshot',
      data: {
        blocks: [
          makeNewBlockData(203, 2),
          makeNewBlockData(202, 0),
          makeNewBlockData(201, 1),
        ],
      },
    });
    act(() => {
      MockWebSocket.instances[0].receive(snapshot);
    });

    expect(renderedBlocks()).toEqual([
      '203:2:6',
      '202:0:6',
      '201:1:6',
      '200:1:6',
      '199:2:6',
    ]);
  });
});
