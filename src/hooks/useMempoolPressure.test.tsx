import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { api } from '../lib/api';
import { MempoolPressure } from '../types';
import {
  MEMPOOL_PRESSURE_EVENT_DEBOUNCE_MS,
  useMempoolPressure,
} from './useMempoolPressure';

vi.mock('../lib/api', () => ({
  api: {
    getMempoolPressure: vi.fn(),
  },
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

function makePressure(pendingBlobCount: number): MempoolPressure {
  return {
    networkId: 1,
    networkName: 'mainnet',
    pendingBlobCount,
    pendingBlobGas: pendingBlobCount * 131072,
    pendingUniqueSenders: Math.min(pendingBlobCount, 2),
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
      likelyIncludableCount: pendingBlobCount,
      underpricedCount: 0,
      unknownPricingCount: 0,
    },
    sampleLimit: 50,
    sampleTruncated: false,
    generatedAt: '2026-01-01T00:02:00.000Z',
  };
}

function makeMempoolUpdateMessage(action: 'add' | 'remove', txHash: string): string {
  return JSON.stringify({
    type: 'mempool_update',
    data: {
      action,
      blob: {
        tx_hash: txHash,
        blob_index: 0,
        from_address: '0x1234567890abcdef1234567890abcdef12345678',
        blob_size_bytes: 131072,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
          {children}
        </LiveDataProvider>
      </QueryClientProvider>
    );
  };
}

describe('useMempoolPressure', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    // The module mock's call history survives across tests in this file
    // (restoreAllMocks only touches spies), and these tests assert on call
    // counts, so start each test from a clean mock.
    vi.mocked(api.getMempoolPressure).mockReset();
    vi.mocked(api.getMempoolPressure).mockResolvedValue(makePressure(3));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves every consumer from one shared fetch and cache entry', async () => {
    const { result } = renderHook(
      () => ({
        hero: useMempoolPressure(DEFAULT_NETWORK.apiParam),
        metrics: useMempoolPressure(DEFAULT_NETWORK.apiParam),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.hero.data).toBeDefined());

    // One request feeds both consumers; two independent polling cycles would
    // let the numbers drift apart between snapshots.
    expect(api.getMempoolPressure).toHaveBeenCalledTimes(1);
    expect(result.current.hero.data?.pendingBlobCount).toBe(3);
    expect(result.current.metrics.data).toBe(result.current.hero.data);
  });

  it('refetches once per burst of mempool_update events so counts track the live list', async () => {
    vi.mocked(api.getMempoolPressure)
      .mockResolvedValueOnce(makePressure(3))
      .mockResolvedValue(makePressure(0));

    const { result } = renderHook(
      () => useMempoolPressure(DEFAULT_NETWORK.apiParam),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data?.pendingBlobCount).toBe(3));
    expect(api.getMempoolPressure).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    act(() => {
      MockWebSocket.instances[0].open();
      MockWebSocket.instances[0].receive(makeMempoolUpdateMessage('remove', '0x01'));
      MockWebSocket.instances[0].receive(makeMempoolUpdateMessage('remove', '0x02'));
      MockWebSocket.instances[0].receive(makeMempoolUpdateMessage('remove', '0x03'));
    });

    // Still inside the debounce window: the burst must not have fired yet,
    // and must collapse into a single refetch when it does.
    expect(api.getMempoolPressure).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEMPOOL_PRESSURE_EVENT_DEBOUNCE_MS + 50);
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.data?.pendingBlobCount).toBe(0));
    expect(api.getMempoolPressure).toHaveBeenCalledTimes(2);
  });

  it('ignores mempool events after unmount instead of invalidating through a dead timer', async () => {
    const { result, unmount } = renderHook(
      () => useMempoolPressure(DEFAULT_NETWORK.apiParam),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    const socket = MockWebSocket.instances[0];

    vi.useFakeTimers();
    act(() => {
      socket.open();
      socket.receive(makeMempoolUpdateMessage('add', '0x04'));
    });
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEMPOOL_PRESSURE_EVENT_DEBOUNCE_MS + 50);
    });

    expect(api.getMempoolPressure).toHaveBeenCalledTimes(1);
  });
});
