import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { api } from '../lib/api';
import { useNetwork } from '../hooks/useNetwork';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';
import { BlobResponse, MempoolUpdateData } from '../types';
import MempoolTable from './MempoolTable';

vi.mock('../lib/api', () => ({
  api: {
    getMempool: vi.fn(),
  },
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

const blob: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 0,
  blob_index: 2,
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  from_address: '0x1234567890abcdef1234567890abcdef12345678',
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  tip_per_blob_gas: '100000000',
  total_cost_eth: '0.001',
  timestamp: '2026-01-01T00:00:00.000Z',
  confirmed: false,
  user_attribution: 'Base',
  max_fee_per_blob_gas: '2000000000',
  blob_gas_used: 131072,
};

function makePendingBlob(txHash: string): BlobResponse {
  return { ...blob, tx_hash: txHash };
}

function makeMempoolUpdateMessage(data: MempoolUpdateData): string {
  return JSON.stringify({ type: 'mempool_update', data });
}

function detailsButtonName(txHash: string): string {
  return `View pending blob details for transaction ${txHash}`;
}

// Mirror the production QueryClient defaults that matter here: a nonzero
// staleTime means a remount inside the stale window renders from cache
// without refetching, which is exactly the window where removed rows used
// to resurrect.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 15_000 } },
  });
}

function mempoolTableUi(queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
        <MempoolTable />
      </LiveDataProvider>
    </QueryClientProvider>
  );
}

function renderMempoolTable() {
  return render(mempoolTableUi(makeQueryClient()));
}

describe('MempoolTable', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(api.getMempool).mockResolvedValue({
      data: [transformBlobToMempoolTransaction(blob, 0)],
    });
  });

  it('opens pending blob details from the transaction hash', async () => {
    renderMempoolTable();

    fireEvent.click(
      await screen.findByRole('button', {
        name: detailsButtonName(blob.tx_hash),
      })
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(blob.tx_hash)).toBeInTheDocument();
    expect(screen.getByText(blob.from_address)).toBeInTheDocument();
    expect(screen.getByText('Blob Index')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close blob details/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies live add and remove events cumulatively', async () => {
    renderMempoolTable();
    await screen.findByRole('button', { name: detailsButtonName(blob.tx_hash) });
    const socket = MockWebSocket.instances[0];
    act(() => socket.open());

    const addedBlob = makePendingBlob(
      '0x1111111111111111111111111111111111111111111111111111111111111111'
    );
    act(() => {
      socket.receive(makeMempoolUpdateMessage({ action: 'add', blob: addedBlob }));
    });
    expect(
      await screen.findByRole('button', { name: detailsButtonName(addedBlob.tx_hash) })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: detailsButtonName(blob.tx_hash) })
    ).toBeInTheDocument();

    act(() => {
      socket.receive(
        makeMempoolUpdateMessage({
          action: 'remove',
          blob: { network_id: 1, network_name: 'mainnet', tx_hash: blob.tx_hash },
        })
      );
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: detailsButtonName(blob.tx_hash) })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: detailsButtonName(addedBlob.tx_hash) })
    ).toBeInTheDocument();

    // Regression: a later event must not resurrect a previously removed row
    // (the old implementation re-derived the list from the REST snapshot plus
    // only the latest event, so removals were forgotten).
    const laterBlob = makePendingBlob(
      '0x2222222222222222222222222222222222222222222222222222222222222222'
    );
    act(() => {
      socket.receive(makeMempoolUpdateMessage({ action: 'add', blob: laterBlob }));
    });
    expect(
      await screen.findByRole('button', { name: detailsButtonName(laterBlob.tx_hash) })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: detailsButtonName(blob.tx_hash) })
    ).not.toBeInTheDocument();
  });

  it('accumulates one row per blob for a multi-blob transaction', async () => {
    renderMempoolTable();
    await screen.findByRole('button', { name: detailsButtonName(blob.tx_hash) });
    const socket = MockWebSocket.instances[0];
    act(() => socket.open());

    const txHash =
      '0x3333333333333333333333333333333333333333333333333333333333333333';
    act(() => {
      socket.receive(
        makeMempoolUpdateMessage({
          action: 'add',
          blob: { ...makePendingBlob(txHash), blob_index: 0 },
        })
      );
      socket.receive(
        makeMempoolUpdateMessage({
          action: 'add',
          blob: { ...makePendingBlob(txHash), blob_index: 1 },
        })
      );
    });
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: detailsButtonName(txHash) })
      ).toHaveLength(2)
    );

    // Removes drop every blob entry of the transaction.
    act(() => {
      socket.receive(
        makeMempoolUpdateMessage({
          action: 'remove',
          blob: { network_id: 1, network_name: 'mainnet', tx_hash: txHash },
        })
      );
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: detailsButtonName(txHash) })
      ).not.toBeInTheDocument()
    );
  });

  it('does not resurrect removed rows when remounting from a warm cache', async () => {
    // Regression for live deltas living only in hook-local state: navigating
    // away and back inside the stale window used to reseed from the original
    // REST snapshot, bringing back transactions the mempool already dropped.
    const queryClient = makeQueryClient();
    const view = render(mempoolTableUi(queryClient));
    await screen.findByRole('button', { name: detailsButtonName(blob.tx_hash) });

    const socket = MockWebSocket.instances[0];
    act(() => socket.open());
    act(() => {
      socket.receive(
        makeMempoolUpdateMessage({
          action: 'remove',
          blob: { network_id: 1, network_name: 'mainnet', tx_hash: blob.tx_hash },
        })
      );
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: detailsButtonName(blob.tx_hash) })
      ).not.toBeInTheDocument()
    );

    view.unmount();
    render(mempoolTableUi(queryClient));

    expect(
      await screen.findByText('No pending blob transactions right now.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: detailsButtonName(blob.tx_hash) })
    ).not.toBeInTheDocument();
  });
});
