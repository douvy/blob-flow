import { render, screen, fireEvent } from '@testing-library/react';
import RawBlobViewer from './RawBlobViewer';
import { fetchRawBlob, RawBlobError } from '../lib/api/rawBlob';
import { BlobResponse } from '../types';

vi.mock('../lib/api/rawBlob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/rawBlob')>();
  return { ...actual, fetchRawBlob: vi.fn() };
});

const fetchRawBlobMock = vi.mocked(fetchRawBlob);

const VERSIONED_HASH = `0x01${'ab'.repeat(31)}`;

// Mainnet genesis (2020-12-01T12:00:23Z) plus 120 seconds: beacon slot 10.
const blobFixture: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 1000,
  blob_index: 2,
  tx_hash: `0x${'aa'.repeat(32)}`,
  from_address: `0x${'bb'.repeat(20)}`,
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  tip_per_blob_gas: '1000000000',
  total_cost_eth: '0.001',
  timestamp: '2020-12-01T12:02:23Z',
  confirmed: true,
  versioned_hash: VERSIONED_HASH,
};

function blobBytesStartingWith(text: string): Uint8Array {
  const bytes = new Uint8Array(131072);
  bytes.set(new TextEncoder().encode(text));
  return bytes;
}

describe('RawBlobViewer', () => {
  beforeEach(() => {
    fetchRawBlobMock.mockReset();
  });

  it('renders nothing when no blob is selected', () => {
    render(<RawBlobViewer blob={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the indexer-provided slot when present', async () => {
    fetchRawBlobMock.mockResolvedValue(blobBytesStartingWith('hello'));

    render(<RawBlobViewer blob={{ ...blobFixture, slot: 4321 }} onClose={() => {}} />);

    await screen.findByText(/^68 65 6c 6c 6f/);
    expect(fetchRawBlobMock).toHaveBeenCalledWith(4321, VERSIONED_HASH, 'mainnet');
    expect(screen.getByText('4,321')).toBeInTheDocument();
  });

  it('fetches by derived slot and shows stats plus a hex preview', async () => {
    fetchRawBlobMock.mockResolvedValue(blobBytesStartingWith('hello'));

    render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);

    expect(screen.getByText(/Fetching blob from the archive/)).toBeInTheDocument();
    expect(await screen.findByText(/^68 65 6c 6c 6f/)).toBeInTheDocument();
    expect(fetchRawBlobMock).toHaveBeenCalledWith(10, VERSIONED_HASH, 'mainnet');

    expect(screen.getByText('Beacon Slot')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('128 KB')).toBeInTheDocument();
  });

  it('switches between hex and text previews', async () => {
    fetchRawBlobMock.mockResolvedValue(blobBytesStartingWith('hello blob'));

    render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);
    await screen.findByText(/^68 65 6c 6c 6f/);

    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    expect(screen.getByText(/hello blob/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hex' }));
    expect(screen.getByText(/^68 65 6c 6c 6f/)).toBeInTheDocument();
  });

  it('shows archive errors with a retry that refetches', async () => {
    fetchRawBlobMock.mockRejectedValueOnce(
      new RawBlobError(502, 'Could not reach the blob archive.')
    );
    fetchRawBlobMock.mockResolvedValueOnce(blobBytesStartingWith('hello'));

    render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);

    expect(await screen.findByText('Could not reach the blob archive.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/^68 65 6c 6c 6f/)).toBeInTheDocument();
  });

  it('refetches a cached transient error when reopened', async () => {
    fetchRawBlobMock.mockRejectedValueOnce(
      new RawBlobError(502, 'Could not reach the blob archive.')
    );
    fetchRawBlobMock.mockResolvedValueOnce(blobBytesStartingWith('hello'));

    const { rerender } = render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);
    await screen.findByText('Could not reach the blob archive.');

    rerender(<RawBlobViewer blob={null} onClose={() => {}} />);
    rerender(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);

    expect(await screen.findByText(/^68 65 6c 6c 6f/)).toBeInTheDocument();
    expect(fetchRawBlobMock).toHaveBeenCalledTimes(2);
  });

  it('errors without fetching when the versioned hash is missing', async () => {
    const blob = { ...blobFixture, versioned_hash: undefined };

    render(<RawBlobViewer blob={blob} onClose={() => {}} />);

    expect(
      await screen.findByText(/missing the data needed to locate it in the archive/)
    ).toBeInTheDocument();
    expect(fetchRawBlobMock).not.toHaveBeenCalled();
  });

  it('shows a pending state for not-yet-synced slots and retries on demand', async () => {
    fetchRawBlobMock.mockRejectedValueOnce(
      new RawBlobError(503, 'The archive has not synced this slot yet. Try again shortly.')
    );
    fetchRawBlobMock.mockResolvedValueOnce(blobBytesStartingWith('hello'));

    render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);

    expect(await screen.findByText('Archive pending')).toBeInTheDocument();
    expect(screen.getByText(/have not reached the archive yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Try again shortly/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText(/^68 65 6c 6c 6f/)).toBeInTheDocument();
    expect(fetchRawBlobMock).toHaveBeenCalledTimes(2);
  });

  it('attributes blob data to BlobArchive and bloar in every state', async () => {
    fetchRawBlobMock.mockRejectedValue(new RawBlobError(404, 'Blob not found in the archive.'));

    render(<RawBlobViewer blob={blobFixture} onClose={() => {}} />);
    await screen.findByText('Blob not found in the archive.');

    expect(screen.getByRole('link', { name: 'BlobArchive' })).toHaveAttribute(
      'href',
      'https://blobarchive.net'
    );
    expect(screen.getByRole('link', { name: 'bloar' })).toHaveAttribute(
      'href',
      'https://github.com/blobarchive/bloar'
    );
    // Reopening cannot make an absent blob appear, so 404 gets no retry.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    fetchRawBlobMock.mockResolvedValue(blobBytesStartingWith('hello'));
    const onClose = vi.fn();

    render(<RawBlobViewer blob={blobFixture} onClose={onClose} />);
    await screen.findByText(/^68 65 6c 6c 6f/);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
