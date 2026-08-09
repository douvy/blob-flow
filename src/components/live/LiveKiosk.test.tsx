import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '@/constants';
import { LiveDataProvider } from '@/contexts/LiveDataContext';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { useTopUsers } from '@/hooks/useTopUsers';
import { KIOSK_ROLLUP_FETCH, KIOSK_TICKER_BLOCKS } from '@/lib/liveKiosk';
import type { BlobPricing, MempoolTransaction, TopUsersResponse } from '@/types';
import LiveKiosk from './LiveKiosk';

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/hooks/useTopUsers', () => ({
  useTopUsers: vi.fn(),
}));

// The kiosk reads ?focus= via useSearchParams; tests drive it through this.
const mockSearchParams = { value: new URLSearchParams() };
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams.value,
}));

// Radix's Select needs pointer APIs jsdom does not provide, and the controls
// have their own test; the kiosk assertions here are about the data panels.
vi.mock('./KioskControls', () => ({
  default: () => <div data-testid="kiosk-controls" />,
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
    this.onclose?.(new CloseEvent('close'));
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

function makePricingRecord(
  blockNumber: number,
  blobCount: number,
  feeGwei: string,
  maxBlobs = 6
) {
  return {
    block_number: blockNumber,
    block_timestamp: '2026-01-01T00:00:00.000Z',
    blob_count: blobCount,
    blob_gas_used: blobCount * 131072,
    blob_gas_target: 393216,
    blob_gas_limit: maxBlobs * 131072,
    excess_blob_gas: 0,
    blob_base_fee: '250000000',
    blob_base_fee_gwei: feeGwei,
    utilization_ratio: (blobCount / maxBlobs).toString(),
    blob_params_target: 3,
    blob_params_max: maxBlobs,
    target_blobs: 3,
    max_blobs: maxBlobs,
    available_blobs: maxBlobs - blobCount,
    utilization_percent: (blobCount / maxBlobs) * 100,
    is_full: blobCount === maxBlobs,
    is_above_target: blobCount > 3,
    update_fraction: 3338477,
  };
}

/** Minimal blob record; only attribution and identity matter to the kiosk. */
function makeEventBlob(blockNumber: number, blobIndex: number, user?: string) {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: blockNumber,
    blob_index: blobIndex,
    tx_hash: `0xblock${blockNumber}blob${blobIndex}`,
    from_address: '0xsender',
    blob_size_bytes: 131072,
    base_fee_per_blob_gas: '250000000',
    tip_per_blob_gas: '0',
    total_cost_eth: '0',
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: true,
    user_attribution: user,
  };
}

function makeNewBlockMessage(
  blockNumber: number,
  blobCount: number,
  feeGwei: string,
  blobUsers: Array<string | undefined> = []
): string {
  return JSON.stringify({
    type: 'new_block',
    data: {
      block_number: blockNumber,
      blob_count: blobCount,
      timestamp: '2026-01-01T00:00:00.000Z',
      blobs: blobUsers.map((user, index) => makeEventBlob(blockNumber, index, user)),
      pricing: makePricingRecord(blockNumber, blobCount, feeGwei),
    },
  });
}

function makeBlockSnapshotMessage(
  blocks: Array<{ blockNumber: number; blobCount: number; feeGwei: string }>
): string {
  return JSON.stringify({
    type: 'block_snapshot',
    data: {
      blocks: blocks.map((block) => ({
        block_number: block.blockNumber,
        blob_count: block.blobCount,
        timestamp: '2026-01-01T00:00:00.000Z',
        blobs: [],
        pricing: makePricingRecord(block.blockNumber, block.blobCount, block.feeGwei),
      })),
    },
  });
}

function makePricing(overrides: Partial<BlobPricing> = {}): BlobPricing {
  return {
    networkId: 1,
    networkName: 'Mainnet',
    currentBaseFee: '0.25 Gwei',
    currentBaseFeeWei: '250000000',
    currentBaseFeeGwei: '0.25',
    currentExcessGas: 0,
    currentUtilization: 0.5,
    predictedNextFee: '0.3 Gwei',
    predictedNextFeeGwei: '0.3',
    forkStage: 'cancun',
    blobParams: { target: 3, max: 6, updateFraction: 3338477, targetGas: 393216, maxGas: 786432 },
    marketPressure: {
      recentBlocksAboveTarget: 2,
      consecutiveFullBlocks: 0,
      percentRecentBlocksAtMaxBlobs: 10,
      predictedDirection: 'up',
      nextBlockFeeEstimate: { low: '0.2 Gwei', high: '0.4 Gwei' },
    },
    recentBlocks: [],
    ...overrides,
  };
}

const EMPTY_TOP_USERS: TopUsersResponse = { data: [], hasServerShares: true };

/** One pending blob entry; `maxFeeWei` decides whether it is priced in. */
function makeMempoolTransaction(index: number, maxFeeWei: string): MempoolTransaction {
  return {
    id: index,
    txHash: `0xpending${index}`,
    fromAddress: '0xabc…def',
    fromAddressFull: '0xabcdef',
    user: 'Base',
    blobCount: 1,
    blobSizeBytes: 131072,
    baseFeeGwei: '0.25',
    tipGwei: '0',
    maxFeeGwei: '1',
    feeHeadroom: '1',
    realizedCost: '0',
    maxCost: '0',
    estimatedCost: '0',
    timeInMempool: '2026-01-01T00:00:00.000Z',
    rawBlob: {
      network_id: 1,
      network_name: 'mainnet',
      block_number: 0,
      blob_index: index,
      tx_hash: `0xpending${index}`,
      max_fee_per_blob_gas: maxFeeWei,
    } as MempoolTransaction['rawBlob'],
  };
}

function mockPricingQueries(
  pricing: BlobPricing | undefined,
  isLoading = false,
  error: Error | null = null,
  mempool?: { data: MempoolTransaction[]; truncated: boolean },
  auxErrors: { mempool?: Error; topUsers?: Error } = {}
) {
  vi.mocked(useApiData).mockImplementation(((
    _fetchFunction: () => Promise<unknown>,
    queryKey: QueryKey
  ) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'blob-pricing-kiosk' || key === 'blob-pricing-head') {
      return {
        data: pricing,
        isLoading,
        isFetching: false,
        error,
        dataUpdatedAt: 0,
        refetch: vi.fn(),
      };
    }
    return {
      data: key === 'mempool' ? mempool : undefined,
      isLoading: false,
      isFetching: false,
      error: key === 'mempool' ? (auxErrors.mempool ?? null) : null,
      dataUpdatedAt: 0,
      refetch: vi.fn(),
    };
  }) as unknown as typeof useApiData);
}

function renderKiosk() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
        <LiveKiosk />
      </LiveDataProvider>
    </QueryClientProvider>
  );
  return { ...view, queryClient };
}

function openSocket() {
  act(() => {
    MockWebSocket.instances[0].open();
  });
}

function receive(message: string) {
  act(() => {
    MockWebSocket.instances[0].receive(message);
  });
}

describe('LiveKiosk', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    mockSearchParams.value = new URLSearchParams();
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.mocked(useNetwork).mockReset();
    vi.mocked(useApiData).mockReset();
    vi.mocked(useTopUsers).mockReset();

    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useTopUsers).mockReturnValue({
      data: EMPTY_TOP_USERS,
      isLoading: false,
      error: null,
      scopeKey: 'mainnet:1h',
    });
    mockPricingQueries(makePricing());
  });

  it('shows the loading skeleton before any pricing data arrives', () => {
    mockPricingQueries(undefined, true);

    renderKiosk();

    expect(screen.queryByLabelText('Recent blocks')).not.toBeInTheDocument();
    expect(screen.queryByText('Blob base fee')).not.toBeInTheDocument();
    // The status strip is outside the wrapper, so the wall is never blank.
    expect(screen.getByText('BlobFlow')).toBeInTheDocument();
  });

  it('renders the fee, prediction, gauge, and a full ticker row once loaded', () => {
    mockPricingQueries(
      makePricing({
        recentBlocks: [
          {
            blockNumber: 100,
            blockTimestamp: '2026-01-01T00:00:00.000Z',
            blobCount: 3,
            blobGasUsed: 393216,
            blobGasTarget: 393216,
            blobGasLimit: 786432,
            excessBlobGas: 0,
            blobBaseFee: '0.25 Gwei',
            blobBaseFeeGwei: '0.25',
            utilizationRatio: 0.5,
            targetBlobs: 3,
            maxBlobs: 6,
            availableBlobs: 3,
            utilizationPercent: 50,
            isFull: false,
            isAboveTarget: false,
          },
        ],
      })
    );

    renderKiosk();

    // The headline and the block's ticker card both print the fee.
    expect(screen.getAllByText('0.25').length).toBeGreaterThan(0);
    expect(screen.getByText('0.3 Gwei')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /Blobspace fullness 50 percent/ })).toBeInTheDocument();
    // Ten fixed slots: one block plus nine placeholders.
    expect(screen.getByLabelText('Recent blocks').children).toHaveLength(KIOSK_TICKER_BLOCKS);
  });

  it('updates the readouts from new_block events without a refetch', () => {
    renderKiosk();
    openSocket();

    receive(makeNewBlockMessage(200, 2, '0.5'));

    expect(screen.getAllByText('0.5').length).toBeGreaterThan(0);
    expect(screen.getByText('Block 200', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('meter', { name: /Blobspace fullness 33 percent, 2\/6 blobs/ })
    ).toBeInTheDocument();
  });

  it('celebrates a 100% full block and clears the banner afterwards', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderKiosk();
      openSocket();

      receive(makeNewBlockMessage(300, 6, '0.9'));

      const banner = screen.getByRole('status');
      expect(banner).toHaveTextContent('Blobspace full · block 300');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not celebrate an ordinary block', () => {
    renderKiosk();
    openSocket();

    receive(makeNewBlockMessage(301, 4, '0.9'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the last market on screen and flags the stream when the socket drops', () => {
    renderKiosk();
    openSocket();
    receive(makeNewBlockMessage(400, 5, '0.75'));

    expect(screen.getByText('Live')).toBeInTheDocument();

    act(() => {
      MockWebSocket.instances[0].close();
    });

    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
    // The wall must not blank out while the socket is down.
    expect(screen.getAllByText('0.75').length).toBeGreaterThan(0);
    expect(screen.getByText('Block 400', { exact: false })).toBeInTheDocument();
  });

  it('heals the ticker from the reconnect block_snapshot', () => {
    renderKiosk();
    openSocket();
    receive(makeNewBlockMessage(500, 1, '0.4'));

    receive(
      makeBlockSnapshotMessage([
        { blockNumber: 503, blobCount: 6, feeGwei: '0.8' },
        { blockNumber: 502, blobCount: 2, feeGwei: '0.7' },
        { blockNumber: 501, blobCount: 3, feeGwei: '0.6' },
      ])
    );

    expect(screen.getAllByText('0.8').length).toBeGreaterThan(0);
    expect(screen.getByText('Block 503', { exact: false })).toBeInTheDocument();
    const ticker = screen.getByLabelText('Recent blocks');
    expect(ticker.textContent).toContain('503');
    expect(ticker.textContent).toContain('500');
  });

  it('shows pending demand priced against the live base fee', () => {
    // Base fee is 250000000 wei: the first two entries clear it, the third does not.
    mockPricingQueries(makePricing(), false, null, {
      data: [
        makeMempoolTransaction(1, '500000000'),
        makeMempoolTransaction(2, '250000000'),
        makeMempoolTransaction(3, '1000'),
      ],
      truncated: false,
    });

    renderKiosk();

    expect(screen.getByText('Public mempool')).toBeInTheDocument();
    // The headline count and the per-sender icon row both print "3".
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('blobs waiting')).toBeInTheDocument();
    expect(screen.getByText('2 priced in')).toBeInTheDocument();
    // All three pending entries are attributed to Base.
    expect(screen.getByLabelText('Largest waiting senders')).toHaveTextContent('Base: 3');
  });

  it('holds the mempool panel steady before a sample arrives', () => {
    renderKiosk();

    expect(screen.getByText('Public mempool')).toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.getByText('blobs waiting')).toBeInTheDocument();
  });

  it('says the mempool is unavailable rather than loading forever', () => {
    mockPricingQueries(makePricing(), false, null, undefined, {
      mempool: new Error('mempool down'),
    });

    renderKiosk();

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
  });

  it('flags the rollup panel when its fetch failed', () => {
    vi.mocked(useTopUsers).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('users down'),
      scopeKey: 'mainnet:1h',
    });

    renderKiosk();

    expect(screen.getByText('unavailable')).toBeInTheDocument();
  });

  it('renders from the websocket alone when the pricing fetch fails', () => {
    // A live socket must run the wall even with /blob/pricing down: the old
    // gating hid a healthy stream behind the error screen.
    mockPricingQueries(undefined, false, new Error('pricing down'));

    renderKiosk();
    openSocket();
    receive(makeNewBlockMessage(800, 4, '0.65'));

    expect(screen.queryByText('Waiting for the blob market')).not.toBeInTheDocument();
    expect(screen.getAllByText('0.65').length).toBeGreaterThan(0);
    expect(screen.getByText('Block 800', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('meter', { name: /Blobspace fullness 67 percent/ })
    ).toBeInTheDocument();
    // No REST head means no prediction; "0 Gwei" would read as a real forecast.
    expect(screen.queryByText('Next block')).not.toBeInTheDocument();
  });

  it('still shows the error screen when nothing has arrived at all', () => {
    mockPricingQueries(undefined, false, new Error('pricing down'));

    renderKiosk();

    expect(screen.getByText('Waiting for the blob market')).toBeInTheDocument();
    expect(screen.getByText('pricing down')).toBeInTheDocument();
  });

  it('focuses on one rollup: scoped ticker, filtered mempool, header badge', () => {
    mockSearchParams.value = new URLSearchParams('focus=Base');
    // Two of three pending blobs belong to Base.
    const focusTx = makeMempoolTransaction(1, '500000000');
    const otherTx = { ...makeMempoolTransaction(2, '500000000'), user: 'Arbitrum' };
    const secondFocusTx = makeMempoolTransaction(3, '1000');
    mockPricingQueries(makePricing(), false, null, {
      data: [focusTx, otherTx, secondFocusTx],
      truncated: false,
    });

    renderKiosk();
    openSocket();
    // Block 600: two Base blobs out of three.
    receive(makeNewBlockMessage(600, 3, '0.5', ['Base', 'Base', 'Arbitrum']));

    // Header carries the focus badge; panels rename themselves.
    expect(screen.getAllByText('Base').length).toBeGreaterThan(0);
    expect(screen.getByText('Blocks · Base blobs')).toBeInTheDocument();
    expect(screen.getByText('Mempool · Base')).toBeInTheDocument();

    // Ticker shows the focused count against the block total.
    const ticker = screen.getByLabelText('Recent blocks');
    expect(ticker.textContent).toContain('600');
    expect(ticker.textContent).toContain('of 3/6');

    // Mempool counts only Base's two pending blobs, one of them priced in.
    expect(screen.getByText('blobs waiting')).toBeInTheDocument();
    expect(screen.getByText('1 priced in')).toBeInTheDocument();
    expect(screen.queryByLabelText('Largest waiting senders')).not.toBeInTheDocument();
  });

  it('refreshes the 1h rollup shares on every new block', () => {
    // The backend never broadcasts users_update for the 1h window, so the
    // kiosk must refetch the shared top-users entry itself as blocks land.
    const { queryClient } = renderKiosk();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    openSocket();

    receive(makeNewBlockMessage(700, 2, '0.5'));

    // The limit is part of the key, so assert against the same constant the
    // component fetches with rather than a literal that can silently drift.
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['top-users', DEFAULT_NETWORK.apiParam, KIOSK_ROLLUP_FETCH, '1h'],
    });
    expect(vi.mocked(useTopUsers)).toHaveBeenCalledWith(
      KIOSK_ROLLUP_FETCH,
      DEFAULT_NETWORK.apiParam,
      '1h'
    );
  });

  it('offers the wordmark as the way out of the kiosk', () => {
    renderKiosk();

    const exit = screen.getByLabelText('Leave TV mode for the dashboard');
    expect(exit).toHaveAttribute('href', '/');
    expect(exit).toHaveTextContent('BlobFlow');
  });

  it('lists the top rollups sized against the leader', () => {
    vi.mocked(useTopUsers).mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            name: 'Base',
            address: '0x1',
            attributed: true,
            dataCount: 80,
            percentage: 40,
            totalCostEth: '1',
            lastTimestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            name: 'Arbitrum',
            address: '0x2',
            attributed: true,
            dataCount: 40,
            percentage: 20,
            totalCostEth: '1',
            lastTimestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
        hasServerShares: true,
      },
      isLoading: false,
      error: null,
      scopeKey: 'mainnet:1h',
    });

    renderKiosk();

    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
