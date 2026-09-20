"use client";

import React from 'react';
import { CANDIDATE_REASON_LABELS, isCandidateReason } from '@/lib/builders';

/**
 * Why a pending blob transaction was left out of a block, as a labelled pill
 * with the full explanation in its title. Eligible is the only reason that
 * carries a question (the builder could have taken it and did not), so it
 * alone is highlighted. A reason this build does not know is shown raw rather
 * than dropped, so a newer indexer never renders a blank cell.
 */
export default function CandidateReasonBadge({ reason }: { reason: string }) {
  if (!isCandidateReason(reason)) {
    return <span className="text-xs text-[#8a93a5]">{reason}</span>;
  }

  const { label, description } = CANDIDATE_REASON_LABELS[reason];
  const tone =
    reason === 'eligible'
      ? 'border-[#ffb86b] text-[#ffb86b]'
      : 'border-divider text-[#8a93a5]';

  return (
    <span
      title={description}
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs ${tone}`}
    >
      {label}
    </span>
  );
}
