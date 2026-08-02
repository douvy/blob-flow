import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RawBlobActions from './RawBlobActions';
import { checkRawBlobAvailability } from '../lib/api/rawBlob';
import { BlobResponse } from '../types';

vi.mock('../lib/api/rawBlob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/rawBlob')>();
  return { ...actual, checkRawBlobAvailability: vi.fn() };
});

const checkAvailabilityMock = vi.mocked(checkRawBlobAvailability);

const VERSIONED_HASH = `0x01${'cd'.repeat(31)}`;

const blobFixture: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 1000,
  blob_index: 0,
  tx_hash: `0x${'aa'.repeat(32)}`,
  from_address: `0x${'bb'.repeat(20)}`,
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  tip_per_blob_gas: '1000000000',
  total_cost_eth: '0.001',
  timestamp: '2020-12-01T12:02:23Z',
  confirmed: true,
  versioned_hash: VERSIONED_HASH,
  slot: 777,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RawBlobActions', () => {
  beforeEach(() => {
    checkAvailabilityMock.mockReset();
  });

  it('links a direct download with bloar attribution when available', async () => {
    checkAvailabilityMock.mockResolvedValue('available');

    renderWithClient(<RawBlobActions blob={blobFixture} />);

    const download = await screen.findByRole('link', { name: /Download/ });
    expect(download).toHaveAttribute(
      'href',
      `/api/raw-blob?slot=777&versioned_hash=${VERSIONED_HASH}&network=mainnet&download=1`
    );
    expect(download).toHaveAttribute('download', `blob-${VERSIONED_HASH}.bin`);
    expect(checkAvailabilityMock).toHaveBeenCalledWith(777, VERSIONED_HASH, 'mainnet');

    const bloar = screen.getByRole('link', { name: 'bloar' });
    expect(bloar).toHaveAttribute('href', 'https://github.com/blobarchive/bloar');
    expect(screen.getByText(/provided by/)).toBeInTheDocument();
  });

  it('shows Pending instead of a link while the archive catches up', async () => {
    checkAvailabilityMock.mockResolvedValue('pending');

    renderWithClient(<RawBlobActions blob={blobFixture} />);

    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bloar' })).toBeInTheDocument();
  });

  it('renders nothing for absent blobs and failed probes', async () => {
    checkAvailabilityMock.mockResolvedValue('missing');
    const { container } = renderWithClient(<RawBlobActions blob={blobFixture} />);
    await waitFor(() => expect(checkAvailabilityMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();

    checkAvailabilityMock.mockResolvedValue('error');
    const second = renderWithClient(<RawBlobActions blob={blobFixture} />);
    await waitFor(() => expect(checkAvailabilityMock).toHaveBeenCalledTimes(2));
    expect(second.container).toBeEmptyDOMElement();
  });

  it('renders nothing when the blob cannot be located in a slot', () => {
    const { container } = renderWithClient(
      <RawBlobActions blob={{ ...blobFixture, slot: undefined, versioned_hash: undefined }} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(checkAvailabilityMock).not.toHaveBeenCalled();
  });
});
