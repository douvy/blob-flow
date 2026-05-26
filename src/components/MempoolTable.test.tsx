import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '../constants';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';
import { useApiData } from '../hooks/useApiData';
import { useNetwork } from '../hooks/useNetwork';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';
import { BlobResponse, MempoolResponse } from '../types';
import MempoolTable from './MempoolTable';

vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../contexts/LiveDataContext', () => ({
  useLatestBlobEvent: vi.fn(),
}));

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

describe('MempoolTable', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useLatestBlobEvent).mockReturnValue(null);
    vi.mocked(useApiData<MempoolResponse>).mockReturnValue({
      data: {
        data: [transformBlobToMempoolTransaction(blob, 0)],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('opens pending blob details from the transaction hash', () => {
    render(<MempoolTable />);

    fireEvent.click(
      screen.getByRole('button', {
        name: `View pending blob details for transaction ${blob.tx_hash}`,
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
});
