import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';
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

vi.mock('../contexts/LiveDataContext', () => ({
  useLatestBlobEvent: vi.fn(),
}));

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

const liveBlob: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 202,
  blob_index: 0,
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  from_address: '0x1234567890abcdef1234567890abcdef12345678',
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  base_fee_per_blob_gas_gwei: '1',
  tip_per_blob_gas: '0',
  total_cost_eth: '0.001',
  timestamp: '2026-01-01T00:00:12.000Z',
  confirmed: true,
  user_attribution: 'Base',
  blob_gas_used: 655360,
};

describe('RecentBlocksPanel', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useLatestBlobEvent).mockReturnValue(null);
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

    render(<RecentBlocksPanel />);

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

  it('adds a target marker to live blocks by reusing fetched capacity params', () => {
    vi.mocked(useLatestBlobEvent).mockReturnValue({
      type: 'new_block',
      data: {
        block_number: 202,
        blob_count: 1,
        timestamp: '2026-01-01T00:00:12.000Z',
        blobs: [liveBlob],
      },
    });
    vi.mocked(useApiData<LatestBlocksResponse>).mockReturnValue({
      data: {
        data: [makeBlock({ id: 201, number: '201', blobGasUsed: 0, blobCount: 0 })],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<RecentBlocksPanel />);

    expect(screen.getByText('5/21 blobs')).toBeInTheDocument();
    const liveMeter = screen.getAllByRole('meter', { name: 'Under target' })[0];
    expect(liveMeter).toHaveAttribute('aria-valuetext', 'Under target; target at 67%');
    expect(liveMeter.querySelector('[title="Target"]')).toHaveStyle({
      left: '66.66666666666666%',
    });
  });
});
