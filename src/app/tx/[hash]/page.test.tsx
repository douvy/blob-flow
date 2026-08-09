import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams } from 'next/navigation';
import { DEFAULT_NETWORK, NETWORKS, SECONDS_PER_BLOCK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { useRawBlobAvailability } from '@/hooks/useRawBlobAvailability';
import { BlobResponse, BlobTransaction } from '@/types';
import TransactionDetailPage from './page';

const TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const FROM_ADDRESS = '0x000000633b68f5D8D3a86593ebB815b4663BCBe0';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ hash: TX_HASH })),
}));

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/hooks/useRawBlobAvailability', () => ({
  useRawBlobAvailability: vi.fn(() => false),
}));

function makeBlob(overrides: Partial<BlobResponse> = {}): BlobResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    block_number: 25467700,
    blob_index: 0,
    tx_hash: TX_HASH,
    transaction_url: `https://etherscan.io/tx/${TX_HASH}`,
    from_address: FROM_ADDRESS,
    from_address_url: `https://etherscan.io/address/${FROM_ADDRESS}`,
    blob_size_bytes: 131072,
    blob_gas_used: 131072,
    base_fee_per_blob_gas: '250000000',
    base_fee_per_blob_gas_gwei: '0.25',
    tip_per_blob_gas: '0',
    total_cost_eth: '0.001',
    realized_cost_wei: '500000000000',
    max_cost_wei: '900000000000',
    versioned_hash: `0x01${'aa'.repeat(31)}`,
    timestamp: '2026-01-01T00:00:00.000Z',
    confirmed: true,
    user_attribution: 'Base',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<BlobTransaction> = {}): BlobTransaction {
  const primary = overrides.primary ?? makeBlob();
  return {
    txHash: TX_HASH,
    blobs: [primary, makeBlob({ blob_index: 1, versioned_hash: `0x01${'bb'.repeat(31)}` })],
    primary,
    blockNumber: 25467700,
    confirmed: true,
    blobsComplete: true,
    ...overrides,
  };
}

function mockTransaction(transaction: BlobTransaction | null) {
  vi.mocked(useApiData).mockReturnValue({
    data: transaction,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useApiData>);
}

describe('TransactionDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ hash: TX_HASH });
    vi.mocked(useRawBlobAvailability).mockReturnValue(false);
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK, NETWORKS.SEPOLIA],
      isNetworkKnown: true,
    });
  });

  it('shows the transaction, its block, and every blob it carries', () => {
    mockTransaction(makeTransaction());
    render(<TransactionDetailPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Blob Transaction');
    expect(screen.getByText(TX_HASH)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '25,467,700' })).toHaveAttribute(
      'href',
      '/block/25467700'
    );
    expect(screen.getByText('2 blobs')).toBeInTheDocument();
    expect(screen.getByText('Blob #0')).toBeInTheDocument();
    expect(screen.getByText('Blob #1')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('sums size and cost across the blobs the transaction carries', () => {
    mockTransaction(makeTransaction());
    render(<TransactionDetailPage />);

    // Two 128 KB blobs at 500 Gwei each: totals, not one row's figures.
    expect(screen.getByText('256 KB')).toBeInTheDocument();
    expect(screen.getByText('1,000 Gwei')).toBeInTheDocument();
    expect(screen.getByText('1,800 Gwei')).toBeInTheDocument();
  });

  it('says so when only some of the blobs could be loaded', () => {
    const primary = makeBlob({
      versioned_hashes: [`0x01${'aa'.repeat(31)}`, `0x01${'bb'.repeat(31)}`, `0x01${'cc'.repeat(31)}`],
    });
    mockTransaction(makeTransaction({ primary, blobs: [primary], blobsComplete: false }));
    render(<TransactionDetailPage />);

    expect(
      screen.getByText(/Only 1 of this transaction's 3 blobs could be loaded/)
    ).toBeInTheDocument();
    // The count is not presented as a complete total.
    expect(screen.getByText('1 of 3 blobs')).toBeInTheDocument();
    expect(screen.queryByText('3 blobs')).not.toBeInTheDocument();
  });

  it('lists the blobs it knows of but has no row for yet', () => {
    // A pending multi-blob transaction returns one row and all of its hashes.
    const primary = makeBlob({
      confirmed: false,
      block_number: null,
      versioned_hashes: [
        `0x01${'aa'.repeat(31)}`,
        `0x01${'cc'.repeat(31)}`,
        `0x01${'dd'.repeat(31)}`,
      ],
    });
    mockTransaction(
      makeTransaction({
        primary,
        blobs: [primary],
        blockNumber: null,
        confirmed: false,
        blobsComplete: false,
      })
    );
    render(<TransactionDetailPage />);

    // The loaded row plus the two hashes with no row yet: every blob in the
    // transaction is copyable, not just the one that came back.
    expect(screen.getAllByRole('button', { name: /versioned hash/i })).toHaveLength(3);
    expect(screen.getAllByText('Blob not indexed yet')).toHaveLength(2);
  });

  it('does not pass off one blob row as a whole transaction', () => {
    // No versioned hash list, so nothing says how many blobs the transaction
    // carries: the count and totals must read as the loaded rows only.
    const primary = makeBlob();
    mockTransaction(makeTransaction({ primary, blobs: [primary], blobsComplete: false }));
    render(<TransactionDetailPage />);

    expect(screen.getByText(/Not every blob in this transaction could be loaded/)).toBeInTheDocument();
    expect(screen.getByText('1 blob loaded')).toBeInTheDocument();
  });

  it('shows no cost total when a blob row is missing its cost', () => {
    const primary = makeBlob();
    const sibling = makeBlob({
      blob_index: 1,
      realized_cost_wei: undefined,
      total_cost_wei: undefined,
      total_cost_eth: '',
    });
    mockTransaction(makeTransaction({ primary, blobs: [primary, sibling] }));
    render(<TransactionDetailPage />);

    // A partial sum would render 500 Gwei and read as the whole cost.
    expect(screen.queryByText('500 Gwei')).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('names the explorer it links out to', () => {
    mockTransaction(makeTransaction());
    render(<TransactionDetailPage />);

    expect(screen.getByRole('link', { name: /view on etherscan\.io/i })).toHaveAttribute(
      'href',
      `https://etherscan.io/tx/${TX_HASH}`
    );
  });

  it('links the sender to its blob activity page', () => {
    mockTransaction(makeTransaction());
    render(<TransactionDetailPage />);

    expect(
      screen.getByRole('link', { name: `${FROM_ADDRESS.slice(0, 6)}...${FROM_ADDRESS.slice(-4)}` })
    ).toHaveAttribute('href', `/user/${encodeURIComponent(FROM_ADDRESS)}`);
  });

  it('marks a transaction that is not yet in a block as pending', () => {
    // Pending rows come back with a null block number, not a zero.
    const primary = makeBlob({ confirmed: false, block_number: null, transaction_url: undefined });
    mockTransaction({
      txHash: TX_HASH,
      blobs: [primary],
      primary,
      blockNumber: null,
      confirmed: false,
    });
    render(<TransactionDetailPage />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Not yet included')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^25,467,700$/ })).not.toBeInTheDocument();
  });

  it('explains an unindexed hash and still offers the explorer', () => {
    mockTransaction(null);
    render(<TransactionDetailPage />);

    expect(screen.getByText(/No blob transaction with this hash is indexed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view on etherscan\.io/i })).toHaveAttribute(
      'href',
      `https://etherscan.io/tx/${TX_HASH}`
    );
  });

  it('offers a copy control for the hash and for a shareable link', () => {
    mockTransaction(makeTransaction());
    render(<TransactionDetailPage />);

    expect(screen.getByRole('button', { name: 'Copy transaction hash' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy link to this transaction' })
    ).toBeInTheDocument();
    // Every blob's versioned hash is truncated on screen, so each gets its own.
    expect(screen.getByRole('button', { name: 'Copy blob #0 versioned hash' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy blob #1 versioned hash' })).toBeInTheDocument();
  });

  it('reads the transaction from the network the route is scoped to', () => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: NETWORKS.SEPOLIA,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK, NETWORKS.SEPOLIA],
      isNetworkKnown: true,
    });
    mockTransaction(null);
    render(<TransactionDetailPage />);

    expect(vi.mocked(useApiData).mock.calls.at(-1)?.[1]).toEqual([
      'blob-transaction',
      'sepolia',
      TX_HASH,
    ]);
    expect(screen.getByText(/is indexed for Sepolia/)).toBeInTheDocument();
    // The explorer link follows the network too.
    expect(screen.getByRole('link', { name: /view on sepolia\.etherscan\.io/i })).toBeInTheDocument();
  });

  describe('polling', () => {
    // The page passes react-query a function so the interval can follow the
    // result; exercise that function directly, since useApiData is mocked.
    function pollFor(data: BlobTransaction | null) {
      const options = vi.mocked(useApiData).mock.calls.at(-1)?.[2];
      const refetchInterval = options?.refetchInterval;
      if (typeof refetchInterval !== 'function') {
        throw new Error('the transaction query should poll conditionally');
      }
      return refetchInterval({ state: { data } } as unknown as Parameters<
        typeof refetchInterval
      >[0]);
    }

    it('stops once the transaction is confirmed with all of its blobs', () => {
      mockTransaction(makeTransaction());
      render(<TransactionDetailPage />);

      expect(pollFor(makeTransaction())).toBe(false);
    });

    it('keeps polling a transaction that is still moving', () => {
      mockTransaction(makeTransaction());
      render(<TransactionDetailPage />);

      const everyBlock = SECONDS_PER_BLOCK * 1000;
      expect(pollFor(null)).toBe(everyBlock);
      expect(pollFor(makeTransaction({ confirmed: false, blockNumber: null }))).toBe(everyBlock);
      // Confirmed but missing rows: a failed block lookup must not settle the
      // page on lower-bound totals forever.
      expect(pollFor(makeTransaction({ blobsComplete: false }))).toBe(everyBlock);
    });

    it('does not poll a malformed hash', () => {
      vi.mocked(useParams).mockReturnValue({ hash: 'not-a-hash' });
      mockTransaction(null);
      render(<TransactionDetailPage />);

      expect(pollFor(null)).toBe(false);
    });
  });

  it('rejects a malformed hash without offering an explorer link', () => {
    vi.mocked(useParams).mockReturnValue({ hash: 'not-a-hash' });
    mockTransaction(null);
    render(<TransactionDetailPage />);

    expect(screen.getByText('Invalid transaction hash')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view on/i })).not.toBeInTheDocument();
  });
});
