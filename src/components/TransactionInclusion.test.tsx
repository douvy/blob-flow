import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK, SECONDS_PER_BLOCK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import type {
  BlobInclusionResponse,
  BlobInclusionSkippedBlockResponse,
  BlockBuilderResponse,
} from '@/types';
import TransactionInclusion, { sortTimelineBlocks } from './TransactionInclusion';

const TX_HASH = `0x${'aa'.repeat(32)}`;

vi.mock('@/hooks/useApiData', () => ({
  useApiData: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getBlobInclusion: vi.fn(),
  },
}));

function makeBuilder(overrides: Partial<BlockBuilderResponse> = {}): BlockBuilderResponse {
  return {
    key: 'titan',
    name: 'Titan Builder',
    known: true,
    fee_recipient: '0x1234567890abcdef1234567890abcdef12345678',
    extra_data: '0x546974616e',
    tx_count: 180,
    candidate_snapshot: true,
    ...overrides,
  };
}

function makeSkipped(
  overrides: Partial<BlobInclusionSkippedBlockResponse> & { block_number: number }
): BlobInclusionSkippedBlockResponse {
  return {
    block_timestamp: '2026-01-01T00:00:12.000Z',
    blob_count: 6,
    max_blobs: 6,
    blob_base_fee: '1000000000',
    blob_base_fee_gwei: '1',
    builder: makeBuilder(),
    waited_ms: 12_000,
    reason: 'no_room',
    ...overrides,
  };
}

function makeTimeline(overrides: Partial<BlobInclusionResponse> = {}): BlobInclusionResponse {
  return {
    chain_id: 1,
    network_name: 'mainnet',
    tx_hash: TX_HASH,
    confirmed: true,
    first_seen_at: '2026-01-01T00:00:00.000Z',
    time_to_inclusion_ms: 36_000,
    included: {
      block_number: 103,
      block_timestamp: '2026-01-01T00:00:36.000Z',
      blob_count: 3,
      max_blobs: 6,
      blob_base_fee_gwei: '0.5',
      builder: makeBuilder({ key: 'beaver', name: 'beaverbuild' }),
      tx_index: 7,
    },
    window: { from_block: 101, to_block: 102, blocks: 2, snapshot_blocks: 2 },
    skipped_blocks: 2,
    eligible_skipped_blocks: 1,
    skipped: [
      makeSkipped({ block_number: 102, waited_ms: 24_000, reason: 'eligible' }),
      makeSkipped({ block_number: 101 }),
    ],
    skipped_truncated: false,
    ...overrides,
  };
}

function mockTimeline(
  data: BlobInclusionResponse | null | undefined,
  state: { isLoading?: boolean; error?: Error | null } = {}
) {
  vi.mocked(useApiData).mockReturnValue({
    data,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useApiData>);
}

/** The refetch interval the component asked for, evaluated against a result. */
function pollFor(data: BlobInclusionResponse | null) {
  const options = vi.mocked(useApiData).mock.calls.at(-1)?.[2];
  const refetchInterval = options?.refetchInterval;
  if (typeof refetchInterval !== 'function') {
    throw new Error('the timeline query should poll conditionally');
  }
  return refetchInterval({ state: { data } } as unknown as Parameters<typeof refetchInterval>[0]);
}

describe('sortTimelineBlocks', () => {
  it('orders blocks oldest first without mutating the input', () => {
    const blocks = [makeSkipped({ block_number: 5 }), makeSkipped({ block_number: 3 })];
    expect(sortTimelineBlocks(blocks).map((block) => block.block_number)).toEqual([3, 5]);
    expect(blocks.map((block) => block.block_number)).toEqual([5, 3]);
  });
});

describe('TransactionInclusion', () => {
  beforeEach(() => {
    vi.mocked(useApiData).mockReset();
    vi.mocked(api.getBlobInclusion).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('lists the blocks that passed the transaction by, oldest first, then the including block', () => {
    mockTimeline(makeTimeline());
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(screen.getByRole('heading', { name: 'Inclusion timeline' })).toBeInTheDocument();
    expect(
      screen.getByText('Waited through 2 blocks before block 103 included it, 36.0s after our node first saw it.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '2 of them recorded what was pending at their slot start: 2 blocks left this transaction out, 1 while it was eligible.'
      )
    ).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('link', { name: '101' })).toHaveAttribute('href', '/block/101');
    expect(within(rows[0]).getByText('No room')).toBeInTheDocument();
    expect(within(rows[0]).getByText('12.0s')).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: '102' })).toBeInTheDocument();
    expect(within(rows[1]).getByText('Eligible')).toHaveClass('text-[#ffb86b]');
    expect(within(rows[1]).getByText('24.0s')).toBeInTheDocument();

    const included = screen.getByTestId('included-block');
    expect(within(included).getByRole('link', { name: '103' })).toHaveAttribute('href', '/block/103');
    expect(within(included).getByRole('link', { name: 'beaverbuild' })).toHaveAttribute(
      'href',
      '/builder/beaver'
    );
    expect(within(included).getByText('36.0s')).toBeInTheDocument();
    expect(within(included).getByText('Included')).toHaveAttribute(
      'title',
      'The block that carried this transaction, at position #7'
    );
    // Occupancy reads as used over max.
    expect(within(included).getByText('3')).toBeInTheDocument();
    expect(within(included).getByText('/6')).toBeInTheDocument();
  });

  it('says eligible only means visible to our node and not included', () => {
    mockTimeline(makeTimeline());
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(/visible to our node and not included: our mempool is not the builder/)
    ).toBeInTheDocument();
  });

  it('marks a block with no builder row or metrics rather than dropping it', () => {
    mockTimeline(
      makeTimeline({
        skipped: [
          makeSkipped({
            block_number: 101,
            builder: undefined,
            blob_count: undefined,
            max_blobs: undefined,
            blob_base_fee: undefined,
            blob_base_fee_gwei: undefined,
            waited_ms: undefined,
          }),
        ],
        skipped_blocks: 1,
        eligible_skipped_blocks: 0,
        window: { from_block: 101, to_block: 102, blocks: 2, snapshot_blocks: 1 },
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    const row = screen.getAllByRole('row')[1];
    expect(within(row).queryByRole('link', { name: /builder/i })).not.toBeInTheDocument();
    expect(within(row).getAllByText('-')).toHaveLength(4);
    expect(
      screen.getByText(/The other 1 block took no snapshot, so whether they passed it by is unknown\./)
    ).toBeInTheDocument();
  });

  it('describes a pending transaction and keeps polling it', () => {
    mockTimeline(
      makeTimeline({
        confirmed: false,
        time_to_inclusion_ms: undefined,
        included: null,
        window: { from_block: 101, to_block: 102, blocks: 2, snapshot_blocks: 2 },
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(screen.getByText(/^Still pending after 2 blocks/)).toBeInTheDocument();
    expect(screen.queryByTestId('included-block')).not.toBeInTheDocument();
    expect(screen.queryByText('Included')).not.toBeInTheDocument();

    expect(pollFor(makeTimeline({ confirmed: false, included: null }))).toBe(
      SECONDS_PER_BLOCK * 1000
    );
    expect(pollFor(null)).toBe(SECONDS_PER_BLOCK * 1000);
    expect(pollFor(makeTimeline())).toBe(false);
  });

  it('says so when the transaction landed in the very next block', () => {
    mockTimeline(
      makeTimeline({
        window: { from_block: 103, to_block: 102, blocks: 0, snapshot_blocks: 0 },
        skipped: [],
        skipped_blocks: 0,
        eligible_skipped_blocks: 0,
        time_to_inclusion_ms: 800,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(
        'Included by the first block produced after our node saw it, 800 ms after our node first saw it.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/recorded what was pending/)).not.toBeInTheDocument();
    expect(screen.getByTestId('included-block')).toBeInTheDocument();
  });

  it('keeps chronology straight when the including slot started before our node saw it', () => {
    mockTimeline(
      makeTimeline({
        time_to_inclusion_ms: -1_400,
        window: { from_block: 103, to_block: 102, blocks: 0, snapshot_blocks: 0 },
        skipped: [],
        skipped_blocks: 0,
        eligible_skipped_blocks: 0,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText('Included by block 103; its slot started 1.4s before our node saw it.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/after our node/)).not.toBeInTheDocument();
    expect(within(screen.getByTestId('included-block')).getByText('-1.4s')).toBeInTheDocument();

    mockTimeline(makeTimeline({ time_to_inclusion_ms: -1_400 }));
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(
        'Waited through 2 blocks before block 103 included it; its slot started 1.4s before our node saw it.'
      )
    ).toBeInTheDocument();
  });

  it('never presents pruned candidate detail as a measured zero', () => {
    mockTimeline(
      makeTimeline({
        window: { from_block: 1, to_block: 100, blocks: 100, snapshot_blocks: 100 },
        skipped: [],
        skipped_blocks: 0,
        eligible_skipped_blocks: 0,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(
        '100 of them recorded what was pending at their slot start. Their detail for this ' +
          'transaction is no longer retained, so which of them passed it by is unknown.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 blocks left this transaction out/)).not.toBeInTheDocument();

    // Partially pruned: the retained rows are reported, the rest called out.
    mockTimeline(
      makeTimeline({
        window: { from_block: 1, to_block: 100, blocks: 100, snapshot_blocks: 90 },
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(
        '90 of them recorded what was pending at their slot start: 2 blocks left this ' +
          'transaction out, 1 while it was eligible. Detail for 88 more of those blocks is no ' +
          'longer retained, so whether they passed it by is unknown. The other 10 blocks took ' +
          'no snapshot, so whether they passed it by is unknown.'
      )
    ).toBeInTheDocument();
  });

  it('never reads an absent snapshot as nothing skipped', () => {
    mockTimeline(
      makeTimeline({
        window: { from_block: 101, to_block: 105, blocks: 5, snapshot_blocks: 0 },
        skipped: [],
        skipped_blocks: 0,
        eligible_skipped_blocks: 0,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(/None of them recorded what was pending at their slot start/)
    ).toBeInTheDocument();
    // Only the including block is listed; the five unknown blocks are not rows.
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('explains a truncated list against the counted total', () => {
    mockTimeline(
      makeTimeline({
        window: { from_block: 90, to_block: 102, blocks: 13, snapshot_blocks: 13 },
        skipped_blocks: 13,
        eligible_skipped_blocks: 4,
        skipped_truncated: true,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText(
        'Only the 2 most recent skipped blocks are listed; 11 older ones from block 90 on are counted but not shown.'
      )
    ).toBeInTheDocument();
  });

  it('still names the including block when the wait itself is unknown', () => {
    mockTimeline(
      makeTimeline({
        first_seen_at: undefined,
        time_to_inclusion_ms: undefined,
        window: null,
        skipped: [],
        skipped_blocks: 0,
        eligible_skipped_blocks: 0,
      })
    );
    render(<TransactionInclusion txHash={TX_HASH} />);

    expect(
      screen.getByText('Not seen pending before inclusion, so there is no wait to account for.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('included-block')).toBeInTheDocument();
  });

  it('renders nothing while loading, on error, when unindexed, or with nothing to say', () => {
    mockTimeline(undefined, { isLoading: true });
    expect(render(<TransactionInclusion txHash={TX_HASH} />).container).toBeEmptyDOMElement();

    mockTimeline(undefined, { error: new Error('boom') });
    expect(render(<TransactionInclusion txHash={TX_HASH} />).container).toBeEmptyDOMElement();

    mockTimeline(null);
    expect(render(<TransactionInclusion txHash={TX_HASH} />).container).toBeEmptyDOMElement();

    mockTimeline(makeTimeline({ confirmed: false, included: null, window: null, skipped: [] }));
    expect(render(<TransactionInclusion txHash={TX_HASH} />).container).toBeEmptyDOMElement();
  });

  it('keys the query by network and hash, and skips a malformed hash', async () => {
    mockTimeline(null);
    render(<TransactionInclusion txHash={TX_HASH.toUpperCase()} />);

    const [fetchFunction, queryKey, options] = vi.mocked(useApiData).mock.calls[0];
    expect(queryKey).toEqual(['blob-inclusion', DEFAULT_NETWORK.apiParam, TX_HASH]);
    expect(options?.enabled).toBe(true);
    await fetchFunction();
    expect(api.getBlobInclusion).toHaveBeenCalledWith(TX_HASH, DEFAULT_NETWORK.apiParam);

    vi.mocked(useApiData).mockClear();
    render(<TransactionInclusion txHash="not-a-hash" />);
    expect(vi.mocked(useApiData).mock.calls[0][2]?.enabled).toBe(false);
    expect(pollFor(null)).toBe(false);
  });
});
