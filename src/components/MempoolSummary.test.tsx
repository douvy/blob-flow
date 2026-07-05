import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { LiveDataProvider } from '../contexts/LiveDataContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';
import { BlobResponse, MempoolResponse } from '../types';
import { TooltipProvider } from './ui/tooltip';
import MempoolSummary from './MempoolSummary';

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

class MockWebSocket {
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send() {}

  close() {
    this.readyState = 3;
  }
}

function makeBlob(overrides: Partial<BlobResponse>): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 0,
    blob_index: 0,
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
    ...overrides,
  };
}

function renderMempoolSummary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <LiveDataProvider network={DEFAULT_NETWORK.apiParam}>
          <MempoolSummary />
        </LiveDataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe('MempoolSummary', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<MempoolResponse>).mockReturnValue({
      data: {
        data: [
          transformBlobToMempoolTransaction(makeBlob({ tx_hash: '0x01', blob_index: 0 }), 0),
          transformBlobToMempoolTransaction(makeBlob({ tx_hash: '0x01', blob_index: 1 }), 1),
          transformBlobToMempoolTransaction(
            makeBlob({ tx_hash: '0x02', user_attribution: undefined }),
            2
          ),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders a single line with deduped tx counts linking to /mempool', () => {
    renderMempoolSummary();

    const link = screen.getByRole('link', { name: /^Mempool:/ });
    expect(link).toHaveAttribute('href', '/mempool');
    expect(link).toHaveTextContent('2 tx · 3 blobs · 384 KB');
  });

  it('shows the per-sender breakdown and private-mempool caveat on hover', async () => {
    const user = userEvent.setup();
    renderMempoolSummary();

    await user.hover(screen.getByRole('link', { name: /^Mempool:/ }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Base');
    expect(tooltip).toHaveTextContent('1 tx · 2 blobs · 256 KB');
    expect(tooltip).toHaveTextContent('Unknown');
    expect(tooltip).toHaveTextContent(/private channels/);
  });
});
