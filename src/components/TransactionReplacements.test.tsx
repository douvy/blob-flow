import React from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import type { BlobReplacementResponse } from '@/types';
import TransactionReplacements from './TransactionReplacements';

const TX_HASH = `0x${'aa'.repeat(32)}`;
const OTHER_HASH = `0x${'bb'.repeat(32)}`;

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getBlobReplacements: vi.fn(),
  },
}));

function makeEvent(overrides: Partial<BlobReplacementResponse> = {}): BlobReplacementResponse {
  return {
    chain_id: 1,
    replaced_tx_hash: TX_HASH,
    replacement_tx_hash: OTHER_HASH,
    from_address: '0x000000633b68f5D8D3a86593ebB815b4663BCBe0',
    nonce: 12,
    replaced_at: '2026-01-01T00:00:30.000Z',
    replaced_max_priority_fee_per_gas_gwei: '1',
    replacement_max_priority_fee_per_gas_gwei: '2.5',
    replaced_max_fee_per_blob_gas_gwei: '4',
    replacement_max_fee_per_blob_gas_gwei: '3',
    ...overrides,
  };
}

function mockReplacements(
  events: BlobReplacementResponse[] | undefined,
  state: { isLoading?: boolean; error?: Error | null } = {}
) {
  vi.mocked(useApiData).mockReturnValue({
    data: events,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useApiData>);
}

describe('TransactionReplacements', () => {
  beforeEach(() => {
    vi.mocked(useApiData).mockReset();
    vi.mocked(api.getBlobReplacements).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('shows the replacement that superseded this transaction, with fee deltas', () => {
    mockReplacements([makeEvent({ replaced_first_seen_at: '2026-01-01T00:00:18.000Z' })]);
    render(<TransactionReplacements txHash={TX_HASH} />);

    expect(
      screen.getByRole('heading', { name: 'Fee-bump replacements' })
    ).toBeInTheDocument();
    expect(screen.getByText('Replaced by')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/tx/${OTHER_HASH}`);
    expect(screen.getByText('(pending for 12.0s)')).toBeInTheDocument();

    const bump = screen.getByText('+1.5 Gwei');
    expect(bump).toHaveClass('text-green-300');
    const cut = screen.getByText('-1 Gwei');
    expect(cut).toHaveClass('text-[#ff8f8f]');
  });

  it('shows the other direction when this transaction is the replacement', () => {
    mockReplacements([
      makeEvent({ replaced_tx_hash: OTHER_HASH, replacement_tx_hash: TX_HASH }),
    ]);
    render(<TransactionReplacements txHash={TX_HASH} />);

    expect(screen.getByText('Replaced')).toBeInTheDocument();
    expect(screen.queryByText('Replaced by')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', `/tx/${OTHER_HASH}`);
  });

  it('renders no delta for a side with no fee data', () => {
    mockReplacements([
      makeEvent({
        replaced_max_priority_fee_per_gas_gwei: undefined,
        replacement_max_priority_fee_per_gas_gwei: undefined,
        replaced_max_fee_per_blob_gas_gwei: undefined,
        replacement_max_fee_per_blob_gas_gwei: undefined,
      }),
    ]);
    render(<TransactionReplacements txHash={TX_HASH} />);

    expect(screen.getAllByText('- → -')).toHaveLength(2);
    expect(screen.queryByText(/Gwei$/)).not.toBeInTheDocument();
  });

  it('omits the pending duration when the replaced tx was never seen pending', () => {
    mockReplacements([makeEvent()]);
    render(<TransactionReplacements txHash={TX_HASH} />);

    expect(screen.queryByText(/pending for/)).not.toBeInTheDocument();
  });

  it('renders nothing while loading, on error, and with no events', () => {
    mockReplacements([], { isLoading: true });
    const { container: loading } = render(<TransactionReplacements txHash={TX_HASH} />);
    expect(loading).toBeEmptyDOMElement();

    mockReplacements(undefined, { error: new Error('boom') });
    const { container: failed } = render(<TransactionReplacements txHash={TX_HASH} />);
    expect(failed).toBeEmptyDOMElement();

    mockReplacements([]);
    const { container: empty } = render(<TransactionReplacements txHash={TX_HASH} />);
    expect(empty).toBeEmptyDOMElement();
  });

  it('keys the query by network and hash, and skips a malformed hash', async () => {
    mockReplacements([]);
    render(<TransactionReplacements txHash={TX_HASH.toUpperCase()} />);

    const [fetchFunction, queryKey, options] = vi.mocked(useApiData).mock.calls[0];
    expect(queryKey).toEqual(['blob-replacements', DEFAULT_NETWORK.apiParam, TX_HASH]);
    expect(options?.enabled).toBe(true);
    await fetchFunction();
    expect(api.getBlobReplacements).toHaveBeenCalledWith(TX_HASH, DEFAULT_NETWORK.apiParam);

    vi.mocked(useApiData).mockClear();
    render(<TransactionReplacements txHash="not-a-hash" />);
    expect(vi.mocked(useApiData).mock.calls[0][2]?.enabled).toBe(false);
  });
});
