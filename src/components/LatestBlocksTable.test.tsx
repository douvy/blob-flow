import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_NETWORK } from '../constants';
import { api } from '../lib/api';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { Block, BlobResponse, LatestBlocksResponse } from '../types';
import LatestBlocksTable from './LatestBlocksTable';

// Expanded rows render BlobDetailsContent, whose archive-availability hook
// needs a QueryClient.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: {
    getBlockByNumber: vi.fn(),
  },
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

// The table reads live data through useLiveBlockList, which subscribes via
// useLiveBlobEvent; a no-op subscription pins these tests to the REST path.
vi.mock('../contexts/LiveDataContext', () => ({
  useLiveBlobEvent: vi.fn(),
}));

vi.mock('../hooks/useFlipRows', () => ({
  useFlipRows: vi.fn(),
}));

const blob: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 200,
  blob_index: 0,
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  from_address: '0x1234567890abcdef1234567890abcdef12345678',
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  base_fee_per_blob_gas_gwei: '1',
  tip_per_blob_gas: '100000000',
  tip_per_blob_gas_gwei: '0.1',
  total_cost_eth: '0.001',
  timestamp: '2026-01-01T00:00:00.000Z',
  confirmed: true,
  user_attribution: 'Base',
  max_fee_per_blob_gas: '2000000000',
  max_fee_per_blob_gas_gwei: '2',
  blob_gas_used: 131072,
  realized_cost_wei: '1000000000000000',
  max_cost_wei: '2000000000000000',
};

function makeBlock(id: number, blobs: BlobResponse[] = []): Block {
  return {
    id,
    number: id.toString(),
    blobCount: blobs.length,
    blobGasUsed: blobs.length * 131072,
    blobGasTarget: 393216,
    blobGasLimit: 786432,
    targetBlobs: 3,
    maxBlobs: 6,
    availableBlobs: 6 - blobs.length,
    baseFeeGwei: '1',
    utilizationPercent: blobs.length === 0 ? 0 : 16.67,
    isFull: false,
    isAboveTarget: false,
    timestamp: '2026-01-01T00:00:00.000Z',
    attribution: blobs.length > 0 ? ['Base'] : [],
    blobs,
  };
}

// The table reads two queries through the same mocked hook (the block list
// and the expanded row's blob backfill); dispatch on the query key so each
// caller gets its own fixture.
function mockApiData(
  list: LatestBlocksResponse,
  details: { data?: Block | null; isLoading?: boolean; error?: Error | null } = {}
) {
  vi.mocked(useApiData).mockImplementation((fetchFunction, queryKey) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    if (key === 'block-by-number') {
      return {
        // `null` is a real result (block not indexed); pass it through as-is.
        data: details.data,
        isLoading: details.isLoading ?? false,
        error: details.error ?? null,
        refetch: vi.fn(),
      };
    }
    return { data: list, isLoading: false, error: null, refetch: vi.fn() };
  });
}

describe('LatestBlocksTable', () => {
  beforeEach(() => {
    // The vitest setup never clears mock call history between tests; reset
    // here so per-test call assertions see only their own calls.
    vi.mocked(useApiData).mockReset();
    vi.mocked(api.getBlockByNumber).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    mockApiData({
      data: [
        makeBlock(201),
        makeBlock(200, [blob]),
      ],
    });
  });

  it('does not auto-expand a block row on initial load', () => {
    render(<LatestBlocksTable />);

    expect(screen.getByText('1/6 used')).toBeInTheDocument();
    expect(screen.queryByText('Blob details')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

    expect(screen.getByText('Blob details')).toBeInTheDocument();
    expect(screen.getByText('Blob #0')).toBeInTheDocument();
  });

  it('falls back to total_cost_eth when total_cost_wei is invalid', () => {
    mockApiData({
      data: [
        makeBlock(200, [{
          ...blob,
          realized_cost_wei: undefined,
          total_cost_wei: 'not-wei',
          total_cost_eth: '0.001',
        }]),
      ],
    });

    render(<LatestBlocksTable />);

    expect(screen.getAllByText('0.001 ETH')).toHaveLength(2);
  });

  // Blocks past the first page arrive from the list fetch with a blob count
  // but no blob records (the blob feed behind it is capped server-side), so
  // the expanded row backfills them from the per-block endpoint.
  describe('blob record backfill', () => {
    const listBlockMissingBlobs: Block = { ...makeBlock(200), blobCount: 1 };

    it('renders backfilled blob records for rows the list fetch left empty', () => {
      mockApiData(
        { data: [listBlockMissingBlobs] },
        { data: makeBlock(200, [blob]) }
      );

      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      expect(screen.getByText('Blob #0')).toBeInTheDocument();
      expect(screen.queryByText('No blob records available for this block.')).not.toBeInTheDocument();
    });

    it('shows a loading state instead of the empty message while backfilling', () => {
      mockApiData({ data: [listBlockMissingBlobs] }, { isLoading: true });

      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      expect(screen.queryByText('No blob records available for this block.')).not.toBeInTheDocument();
      expect(screen.queryByText('Blob details')).not.toBeInTheDocument();
    });

    it('requests the expanded block and network from the per-block endpoint', async () => {
      mockApiData(
        { data: [listBlockMissingBlobs] },
        { data: makeBlock(200, [blob]) }
      );

      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      const detailsCall = vi.mocked(useApiData).mock.calls.find(
        ([, queryKey]) => Array.isArray(queryKey) && queryKey[0] === 'block-by-number'
      );
      expect(detailsCall?.[1]).toEqual(['block-by-number', DEFAULT_NETWORK.apiParam, '200']);
      await detailsCall![0]();
      expect(api.getBlockByNumber).toHaveBeenCalledWith(200, DEFAULT_NETWORK.apiParam);
    });

    it('shows a not-indexed message when the backfill finds no block', () => {
      mockApiData({ data: [listBlockMissingBlobs] }, { data: null });

      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      expect(screen.getByText(/the indexer has no records for it yet/)).toBeInTheDocument();
      expect(screen.queryByText('No blob records available for this block.')).not.toBeInTheDocument();
    });

    it('shows an error message when the backfill fails', () => {
      mockApiData(
        { data: [listBlockMissingBlobs] },
        { error: new Error('fetch failed') }
      );

      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      expect(screen.getByText(/Could not load blob details/)).toBeInTheDocument();
    });

    it('keeps the backfill query disabled when the list already has the records', () => {
      render(<LatestBlocksTable />);
      fireEvent.click(screen.getByRole('button', { name: 'View blob details for block 200' }));

      const detailsCalls = vi.mocked(useApiData).mock.calls.filter(
        ([, queryKey]) => Array.isArray(queryKey) && queryKey[0] === 'block-by-number'
      );
      expect(detailsCalls.length).toBeGreaterThan(0);
      expect(detailsCalls.every(([, , options]) => options?.enabled === false)).toBe(true);
    });
  });
});
