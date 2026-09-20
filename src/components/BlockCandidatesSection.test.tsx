import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useNetwork } from '@/hooks/useNetwork';
import { CANDIDATE_REASON_LABELS } from '@/lib/builders';
import type {
  BlobInclusionCandidateResponse,
  Block,
  BlockBuilderResponse,
} from '@/types';
import BlockCandidatesSection, { sortCandidates } from './BlockCandidatesSection';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function makeBuilder(overrides: Partial<BlockBuilderResponse> = {}): BlockBuilderResponse {
  return {
    key: 'builder:titan',
    name: 'Titan Builder',
    known: true,
    fee_recipient: '0x1234567890abcdef1234567890abcdef12345678',
    extra_data: '0x546974616e',
    extra_data_text: 'Titan',
    tx_count: 180,
    candidate_snapshot: true,
    pending_candidate_txs: 7,
    eligible_skipped_txs: 2,
    eligible_skipped_blobs: 3,
    eligible_skipped_max_tip_gwei: '1.5',
    ...overrides,
  };
}

function makeCandidate(
  overrides: Partial<BlobInclusionCandidateResponse> & { tx_hash: string }
): BlobInclusionCandidateResponse {
  return {
    from_address: '0x000000633b68f5D8D3a86593ebB815b4663BCBe0',
    blob_count: 1,
    first_seen_at: '2026-01-01T00:00:00.000Z',
    reason: 'eligible',
    ...overrides,
  };
}

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 200,
    number: '200',
    blobCount: 1,
    blobGasUsed: 131072,
    blobGasTarget: 393216,
    blobGasLimit: 786432,
    targetBlobs: 3,
    maxBlobs: 6,
    availableBlobs: 5,
    baseFeeGwei: '1',
    utilizationPercent: 16.67,
    isFull: false,
    isAboveTarget: false,
    timestamp: '2026-01-01T00:00:00.000Z',
    attribution: [],
    blobs: [],
    ...overrides,
  };
}

describe('sortCandidates', () => {
  it('puts eligible rows first, then orders each group by tip', () => {
    const candidates = [
      makeCandidate({ tx_hash: '0xa', reason: 'no_room', max_priority_fee_per_gas_gwei: '9' }),
      makeCandidate({ tx_hash: '0xb', reason: 'eligible', max_priority_fee_per_gas_gwei: '1' }),
      makeCandidate({ tx_hash: '0xc', reason: 'eligible', max_priority_fee_per_gas_gwei: '4' }),
      makeCandidate({ tx_hash: '0xd', reason: 'too_recent' }),
    ];

    expect(sortCandidates(candidates).map((row) => row.tx_hash)).toEqual([
      '0xc',
      '0xb',
      '0xa',
      '0xd',
    ]);
  });

  it('leaves the input array untouched', () => {
    const candidates = [
      makeCandidate({ tx_hash: '0xa', reason: 'no_room' }),
      makeCandidate({ tx_hash: '0xb', reason: 'eligible' }),
    ];

    expect(sortCandidates(candidates)).not.toBe(candidates);
    expect(candidates[0].tx_hash).toBe('0xa');
  });
});

describe('BlockCandidatesSection', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('renders nothing for a block with no builder attribution', () => {
    const { container } = render(<BlockCandidatesSection block={makeBlock()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('says the snapshot is missing rather than implying nothing was skipped', () => {
    render(
      <BlockCandidatesSection
        block={makeBlock({ builder: makeBuilder({ candidate_snapshot: false }) })}
      />
    );

    expect(screen.getByText(/No candidate snapshot/)).toBeInTheDocument();
    expect(screen.queryByText(/eligible and not included/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('summarizes the snapshot and lists its candidates', () => {
    render(
      <BlockCandidatesSection
        block={makeBlock({
          builder: makeBuilder(),
          candidates: [
            makeCandidate({
              tx_hash: `0x${'aa'.repeat(32)}`,
              reason: 'too_recent',
              max_priority_fee_per_gas_gwei: '8',
              max_fee_per_blob_gas_gwei: '3',
              user_attribution: 'Base',
            }),
            makeCandidate({
              tx_hash: `0x${'bb'.repeat(32)}`,
              reason: 'eligible',
              max_priority_fee_per_gas_gwei: '1.5',
              blob_count: 2,
            }),
          ],
        })}
      />
    );

    expect(
      screen.getByText(
        '7 pending blob txs visible to our node, 2 eligible and not included (3 blobs), highest eligible tip 1.5 Gwei'
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/never proof/)).toBeInTheDocument();

    const rows = screen.getAllByRole('row').slice(1);
    // Eligible sorts ahead of the higher-tipping too_recent row.
    expect(within(rows[0]).getByText('Eligible')).toHaveClass('text-[#ffb86b]');
    expect(within(rows[0]).getByText('1.5 Gwei')).toBeInTheDocument();
    expect(within(rows[0]).getByText('2')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link')).toHaveAttribute(
      'href',
      `/tx/0x${'bb'.repeat(32)}`
    );

    const tooRecent = within(rows[1]).getByText('Too recent');
    expect(tooRecent).toHaveAttribute('title', CANDIDATE_REASON_LABELS.too_recent.description);
    expect(tooRecent).not.toHaveClass('text-[#ffb86b]');
    expect(within(rows[1]).getByText('Base')).toBeInTheDocument();
    expect(within(rows[1]).getByText('3 Gwei')).toBeInTheDocument();
  });

  it('renders a dash for a candidate with no fee data', () => {
    render(
      <BlockCandidatesSection
        block={makeBlock({
          builder: makeBuilder(),
          candidates: [makeCandidate({ tx_hash: '0xabc', reason: 'nonce_gap' })],
        })}
      />
    );

    expect(screen.getAllByText('-')).toHaveLength(2);
  });

  it('explains an empty candidate list without denying the snapshot', () => {
    render(
      <BlockCandidatesSection block={makeBlock({ builder: makeBuilder(), candidates: [] })} />
    );

    expect(screen.getByText(/pruned or was empty/)).toBeInTheDocument();
    expect(screen.getByText(/pending blob txs visible to our node/)).toBeInTheDocument();
  });
});
