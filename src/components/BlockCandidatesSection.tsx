"use client";

import React from 'react';
import Link from '@/components/NetworkLink';
import AttributionBadge from '@/components/AttributionBadge';
import { RelativeTime } from '@/components/RelativeTime';
import CandidateReasonBadge from '@/components/CandidateReasonBadge';
import { PRIORITY_FEE_TOOLTIP } from '@/constants';
import { ELIGIBLE_SKIPPED_TOOLTIP } from '@/lib/builders';
import type { Block, BlobInclusionCandidateResponse } from '@/types';
import { formatGwei, truncateAddress, truncateTxHash } from '@/utils';

/**
 * Candidates with the eligible ones first, then by tip, highest first. The
 * eligible rows are the only ones that carry a question (the builder could
 * have taken them and did not), so they lead; within a group the bid orders
 * them. Rows without a tip sort last. The input array is never mutated.
 */
export function sortCandidates(
  candidates: BlobInclusionCandidateResponse[]
): BlobInclusionCandidateResponse[] {
  return [...candidates].sort((a, b) => {
    const eligibilityDelta =
      Number(b.reason === 'eligible') - Number(a.reason === 'eligible');
    if (eligibilityDelta !== 0) return eligibilityDelta;
    return candidateTip(b) - candidateTip(a);
  });
}

function candidateTip(candidate: BlobInclusionCandidateResponse): number {
  const tip = Number(candidate.max_priority_fee_per_gas_gwei);
  return Number.isFinite(tip) ? tip : -1;
}

function formatCandidateGwei(gwei?: string): string {
  if (!gwei) return '-';
  const value = Number(gwei);
  return Number.isFinite(value) ? formatGwei(value, 4) : '-';
}

const TH_CLASS =
  'py-2 px-3 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider';

function CandidateTable({ candidates }: { candidates: BlobInclusionCandidateResponse[] }) {
  const rows = React.useMemo(() => sortCandidates(candidates), [candidates]);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-[#6c727f]">
        The candidate detail for this block has been pruned or was empty.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className={TH_CLASS}>Tx</th>
            <th className={TH_CLASS}>Sender</th>
            <th className={TH_CLASS}>Blobs</th>
            <th className={TH_CLASS}>Tip</th>
            <th className={TH_CLASS}>Max blob fee</th>
            <th className={TH_CLASS}>First seen</th>
            <th className={TH_CLASS}>Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider/80">
          {rows.map((candidate) => {
            const sender = candidate.user_attribution || truncateAddress(candidate.from_address);

            return (
              <tr key={candidate.tx_hash}>
                <td className="py-2 px-3 font-mono text-sm">
                  <Link
                    href={`/tx/${candidate.tx_hash}`}
                    className="text-blue hover:underline"
                    title={candidate.tx_hash}
                  >
                    {truncateTxHash(candidate.tx_hash)}
                  </Link>
                </td>
                <td className="py-2 px-3 text-sm text-white">
                  <span className="flex min-w-0 items-center gap-2">
                    <AttributionBadge
                      user={candidate.user_attribution || 'Unknown'}
                      sizeClass="w-5 h-5"
                      textClass="text-[10px]"
                    />
                    <span className="truncate" title={candidate.from_address}>
                      {sender}
                    </span>
                  </span>
                </td>
                <td className="py-2 px-3 text-sm text-white">{candidate.blob_count}</td>
                <td
                  className="py-2 px-3 text-sm whitespace-nowrap text-white"
                  title={PRIORITY_FEE_TOOLTIP}
                >
                  {formatCandidateGwei(candidate.max_priority_fee_per_gas_gwei)}
                </td>
                <td className="py-2 px-3 text-sm whitespace-nowrap text-white">
                  {formatCandidateGwei(candidate.max_fee_per_blob_gas_gwei)}
                </td>
                <td className="py-2 px-3 text-sm whitespace-nowrap text-white">
                  <RelativeTime timestamp={candidate.first_seen_at} />
                </td>
                <td className="py-2 px-3">
                  <CandidateReasonBadge reason={candidate.reason} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function summarize(builder: NonNullable<Block['builder']>): string {
  const pending = builder.pending_candidate_txs ?? 0;
  const skippedTxs = builder.eligible_skipped_txs ?? 0;
  const skippedBlobs = builder.eligible_skipped_blobs ?? 0;
  const maxTip = builder.eligible_skipped_max_tip_gwei;
  const tipClause = maxTip
    ? `, highest eligible tip ${formatCandidateGwei(maxTip)}`
    : '';

  return (
    `${pending.toLocaleString()} pending blob txs visible to our node, ` +
    `${skippedTxs.toLocaleString()} eligible and not included ` +
    `(${skippedBlobs.toLocaleString()} blobs)${tipClause}`
  );
}

/**
 * What our own node's mempool held at this block's slot start, and why each
 * pending blob transaction was or was not a plausible candidate for it.
 *
 * Our mempool is not the builder's, so none of this proves the builder saw a
 * transaction: the copy says so rather than leaving the reader to infer it.
 * Blocks indexed from history carry no snapshot at all, which is stated
 * outright so an absent snapshot never reads as "nothing was skipped".
 */
export default function BlockCandidatesSection({ block }: { block: Block }) {
  const builder = block.builder;
  if (!builder) return null;

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">
        Pending blob transactions at this slot
      </h2>
      <div className="rounded-lg border border-divider bg-[#0f1322]">
        {builder.candidate_snapshot ? (
          <>
            <div className="border-b border-divider px-4 py-3">
              <p className="text-sm text-white">{summarize(builder)}</p>
              <p className="mt-2 text-xs text-[#6e7787]">{ELIGIBLE_SKIPPED_TOOLTIP}</p>
            </div>
            <CandidateTable candidates={block.candidates ?? []} />
          </>
        ) : (
          <p className="px-4 py-3 text-sm text-[#6c727f]">
            No candidate snapshot: this block was indexed from history, so what our node&apos;s
            mempool held at its slot start is unknown.
          </p>
        )}
      </div>
    </section>
  );
}
