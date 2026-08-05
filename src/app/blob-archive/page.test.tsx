import { render, screen } from '@testing-library/react';
import { BLOB_ARCHIVE_PUBLIC_URL } from '@/constants';
import BlobArchivePage from './page';

describe('BlobArchivePage', () => {
  // The whole point of the page is that this endpoint is not a consensus API.
  // If the warning ever gets edited away, operators lose hours to it, so pin it.
  it('states up front that it is not a beacon blob_sidecars API', () => {
    render(<BlobArchivePage />);

    expect(
      screen.getByText('This is not a beacon blob_sidecars API.')
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot sync or backfill/)).toBeInTheDocument();
  });

  it('tells operators to move to a live consensus endpoint once synced', () => {
    render(<BlobArchivePage />);

    expect(
      screen.getByRole('heading', { name: /use it to sync, then switch away/i })
    ).toBeInTheDocument();
  });

  it('documents only the root base URL, with no profile prefixes', () => {
    const { container } = render(<BlobArchivePage />);
    const text = container.textContent ?? '';

    expect(text).toContain(BLOB_ARCHIVE_PUBLIC_URL);
    expect(text).not.toContain(`${BLOB_ARCHIVE_PUBLIC_URL}/live`);
    expect(text).not.toContain(`${BLOB_ARCHIVE_PUBLIC_URL}/all`);
  });

  it('documents the supported paths', () => {
    render(<BlobArchivePage />);

    expect(screen.getByText('/eth/v1/beacon/blobs/{slot}')).toBeInTheDocument();
    expect(screen.getByText('/eth/v1/beacon/genesis')).toBeInTheDocument();
    expect(screen.getByText('/eth/v1/config/spec')).toBeInTheDocument();
  });
});
