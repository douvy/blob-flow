import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RawBlobActions, { ARCHIVE_DELAYED_AFTER_MS, PENDING_RECHECK_MS } from './RawBlobActions';
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

  it('shows View raw and a direct download with bloar attribution when available', async () => {
    checkAvailabilityMock.mockResolvedValue('available');
    const onViewRaw = vi.fn();

    renderWithClient(<RawBlobActions blob={blobFixture} onViewRaw={onViewRaw} />);

    fireEvent.click(await screen.findByRole('button', { name: 'View raw' }));
    expect(onViewRaw).toHaveBeenCalledTimes(1);

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

  it('shows Archive pending instead of the actions while the archive catches up', async () => {
    checkAvailabilityMock.mockResolvedValue('pending');
    const freshBlob = {
      ...blobFixture,
      timestamp: new Date(Date.now() - 30_000).toISOString(),
    };

    renderWithClient(<RawBlobActions blob={freshBlob} onViewRaw={() => {}} />);

    expect(await screen.findByText('Archive pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View raw' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bloar' })).toBeInTheDocument();
  });

  it('shows Archive delayed when a blob old enough to be archived is still pending', async () => {
    checkAvailabilityMock.mockResolvedValue('pending');
    const staleBlob = {
      ...blobFixture,
      timestamp: new Date(Date.now() - ARCHIVE_DELAYED_AFTER_MS - 1000).toISOString(),
    };

    renderWithClient(<RawBlobActions blob={staleBlob} onViewRaw={() => {}} />);

    expect(await screen.findByText('Archive delayed')).toBeInTheDocument();
    expect(screen.queryByText('Archive pending')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View raw' })).not.toBeInTheDocument();
  });

  it('shows Not archived for blobs definitively absent from the archive', async () => {
    checkAvailabilityMock.mockResolvedValue('missing');

    renderWithClient(<RawBlobActions blob={blobFixture} onViewRaw={() => {}} />);

    expect(await screen.findByText('Not archived')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View raw' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'bloar' })).toBeInTheDocument();
  });

  it('shows Archive unreachable when the probe has never succeeded', async () => {
    checkAvailabilityMock.mockResolvedValue('error');

    renderWithClient(<RawBlobActions blob={blobFixture} onViewRaw={() => {}} />);

    expect(await screen.findByText('Archive unreachable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View raw' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('keeps Archive unreachable visible while a slow retry is in flight', async () => {
    vi.useFakeTimers();
    try {
      // The retry never settles, mimicking a proxy that hangs until timeout;
      // a no-data refetch resets the query status to pending, which must not
      // blank the badge mid retry.
      checkAvailabilityMock
        .mockResolvedValueOnce('error')
        .mockImplementation(() => new Promise<never>(() => {}));

      renderWithClient(<RawBlobActions blob={blobFixture} onViewRaw={() => {}} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Archive unreachable')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PENDING_RECHECK_MS + 1000);
      });
      expect(checkAvailabilityMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Archive unreachable')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the pending badge through a failed recheck', async () => {
    vi.useFakeTimers();
    try {
      const freshBlob = {
        ...blobFixture,
        timestamp: new Date(Date.now() - 30_000).toISOString(),
      };
      checkAvailabilityMock.mockResolvedValueOnce('pending').mockResolvedValue('error');

      renderWithClient(<RawBlobActions blob={freshBlob} onViewRaw={() => {}} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Archive pending')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PENDING_RECHECK_MS + 1000);
      });
      expect(checkAvailabilityMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Archive pending')).toBeInTheDocument();
      expect(screen.queryByText('Archive unreachable')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('transitions from pending to delayed while mounted as rechecks age the blob', async () => {
    vi.useFakeTimers();
    try {
      checkAvailabilityMock.mockResolvedValue('pending');
      const nearThresholdBlob = {
        ...blobFixture,
        timestamp: new Date(Date.now() - ARCHIVE_DELAYED_AFTER_MS + 20_000).toISOString(),
      };

      renderWithClient(<RawBlobActions blob={nearThresholdBlob} onViewRaw={() => {}} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Archive pending')).toBeInTheDocument();

      // Two rechecks later the blob has crossed the threshold; the successful
      // probes advance dataUpdatedAt, flipping the label without a remount.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * PENDING_RECHECK_MS + 1000);
      });
      expect(screen.getByText('Archive delayed')).toBeInTheDocument();
      expect(screen.queryByText('Archive pending')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('recovers the actions after a transient probe failure', async () => {
    vi.useFakeTimers();
    try {
      checkAvailabilityMock.mockResolvedValueOnce('error').mockResolvedValue('available');

      renderWithClient(<RawBlobActions blob={blobFixture} onViewRaw={() => {}} />);

      // First probe fails; the outage is visible instead of the cluster
      // silently missing.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Archive unreachable')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'View raw' })).not.toBeInTheDocument();

      // The recheck interval refetches the failed probe and the actions appear.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PENDING_RECHECK_MS + 1000);
      });
      expect(screen.getByRole('button', { name: 'View raw' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Download/ })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders nothing when the blob cannot be located in a slot', () => {
    const { container } = renderWithClient(
      <RawBlobActions
        blob={{ ...blobFixture, slot: undefined, versioned_hash: undefined }}
        onViewRaw={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(checkAvailabilityMock).not.toHaveBeenCalled();
  });
});
