import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { Block, BlobResponse, LatestBlocksResponse } from '../types';
import LatestBlocksTable from './LatestBlocksTable';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
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

describe('LatestBlocksTable', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: {
        data: [
          makeBlock(201),
          makeBlock(200, [blob]),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
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
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: {
        data: [
          makeBlock(200, [{
            ...blob,
            realized_cost_wei: undefined,
            total_cost_wei: 'not-wei',
            total_cost_eth: '0.001',
          }]),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LatestBlocksTable />);

    expect(screen.getAllByText('0.001 ETH')).toHaveLength(2);
  });
});
