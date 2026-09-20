"use client";

import React from 'react';
import Link from '@/components/NetworkLink';
import BuilderTag from '@/components/BuilderTag';
import CandidateReasonBadge from '@/components/CandidateReasonBadge';
import { RelativeTime } from '@/components/RelativeTime';
import { SECONDS_PER_BLOCK } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import {
  formatTimeToInclusion,
  INCLUSION_TIMELINE_NOTE,
  TIME_TO_INCLUSION_TOOLTIP,
  WAITED_TOOLTIP,
} from '@/lib/builders';
import type {
  BlobInclusionBlockResponse,
  BlobInclusionResponse,
  BlobInclusionSkippedBlockResponse,
} from '@/types';
import { formatBlobFee, formatNumber } from '@/utils';

const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/i;

const TH_CLASS =
  'py-2 px-3 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider';
const TD_CLASS = 'py-2 px-3 text-sm whitespace-nowrap text-white';

function plural(count: number, noun: string): string {
  return `${formatNumber(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The blocks on the timeline oldest first, whatever order they arrived in.
 * The input array is never mutated.
 */
export function sortTimelineBlocks(
  blocks: BlobInclusionSkippedBlockResponse[]
): BlobInclusionSkippedBlockResponse[] {
  return [...blocks].sort((a, b) => a.block_number - b.block_number);
}

/** A block's blob occupancy as "used/max", or "-" when the metrics row is missing. */
function occupancy(block: BlobInclusionBlockResponse): React.ReactNode {
  if (block.blob_count === undefined) return '-';

  return (
    <>
      {formatNumber(block.blob_count)}
      {block.max_blobs !== undefined && (
        <span className="text-[#6e7787]">/{formatNumber(block.max_blobs)}</span>
      )}
    </>
  );
}

function BlockCells({ block }: { block: BlobInclusionBlockResponse }) {
  return (
    <>
      <td className={TD_CLASS}>
        <Link
          href={`/block/${block.block_number}`}
          className="tabular-nums text-blue hover:underline"
        >
          {formatNumber(block.block_number)}
        </Link>
        <div className="text-xs text-[#6e7787]">
          <RelativeTime timestamp={block.block_timestamp} />
        </div>
      </td>
      <td className={`${TD_CLASS} max-w-[12rem]`}>
        {block.builder ? (
          <BuilderTag builder={block.builder} compact />
        ) : (
          <span className="text-[#6e7787]" title="No builder attribution for this block yet">
            -
          </span>
        )}
      </td>
      <td className={`${TD_CLASS} tabular-nums`}>{occupancy(block)}</td>
      <td className={`${TD_CLASS} tabular-nums`}>
        {formatBlobFee(block.blob_base_fee_gwei, block.blob_base_fee)}
      </td>
    </>
  );
}

/**
 * One sentence on how the wait went, and one on how much of it the per-block
 * detail can account for. The second is what keeps a short or empty list
 * honest: a block with no snapshot is unknown, not evidence of nothing.
 */
function Summary({ data }: { data: BlobInclusionResponse }) {
  const { window, included } = data;
  const wait = formatTimeToInclusion(data.time_to_inclusion_ms);
  const firstSeen = data.first_seen_at ? (
    <>
      {' '}
      (first seen <RelativeTime timestamp={data.first_seen_at} />)
    </>
  ) : null;

  let headline: React.ReactNode;
  if (!window) {
    headline = included
      ? 'Not seen pending before inclusion, so there is no wait to account for.'
      : 'Not seen pending yet.';
  } else if (included) {
    const ms = data.time_to_inclusion_ms;
    const blockLabel = `block ${formatNumber(included.block_number)}`;
    if (ms !== undefined && ms < 0) {
      // A negative wait means the including block's slot started before our
      // node saw the transaction, so it was never "after" anything: the
      // builder had it first.
      const lead =
        window.blocks === 0
          ? `Included by ${blockLabel}`
          : `Waited through ${plural(window.blocks, 'block')} before ${blockLabel} included it`;
      headline = `${lead}; its slot started ${formatTimeToInclusion(-ms)} before our node saw it.`;
    } else {
      const waitClause = ms === undefined ? '' : `, ${wait} after our node first saw it`;
      headline =
        window.blocks === 0
          ? `Included by the first block produced after our node saw it${waitClause}.`
          : `Waited through ${plural(window.blocks, 'block')} before ${blockLabel} included it${waitClause}.`;
    }
  } else {
    headline =
      window.blocks === 0 ? (
        <>Still pending: no block has been produced since our node first saw it{firstSeen}.</>
      ) : (
        <>
          Still pending after {plural(window.blocks, 'block')}
          {firstSeen}.
        </>
      );
  }

  let coverage: string | null = null;
  if (window && window.blocks > 0) {
    if (window.snapshot_blocks === 0) {
      coverage =
        'None of them recorded what was pending at their slot start (indexed from history, or ' +
        'since pruned), so which blocks passed it by is unknown.';
    } else {
      // snapshot_blocks is a permanent per-block flag, while the skipped counts
      // come from candidate rows that are pruned after retention. A snapshot
      // block with no row for this transaction is therefore lost detail, not
      // a block that took it in: the copy must never let a zero read as none.
      const unknown = window.blocks - window.snapshot_blocks;
      const pruned = Math.max(0, window.snapshot_blocks - data.skipped_blocks);
      const detail =
        data.skipped_blocks > 0
          ? `: ${plural(data.skipped_blocks, 'block')} left this transaction out, ` +
            `${formatNumber(data.eligible_skipped_blocks)} while it was eligible.`
          : '.';
      const prunedClause =
        pruned === 0
          ? ''
          : data.skipped_blocks > 0
            ? ` Detail for ${formatNumber(pruned)} more of those blocks is no longer retained, so whether they passed it by is unknown.`
            : ' Their detail for this transaction is no longer retained, so which of them passed it by is unknown.';
      const unknownClause =
        unknown > 0
          ? ` The other ${plural(unknown, 'block')} took no snapshot, so whether they passed it by is unknown.`
          : '';
      coverage =
        `${formatNumber(window.snapshot_blocks)} of them recorded what was pending at their slot ` +
        `start${detail}${prunedClause}${unknownClause}`;
    }
  }

  const hidden = data.skipped_blocks - data.skipped.length;
  const truncation =
    data.skipped_truncated && hidden > 0 && window
      ? `Only the ${formatNumber(data.skipped.length)} most recent skipped blocks are listed; ` +
        `${plural(hidden, 'older one')} from block ${formatNumber(window.from_block)} on ` +
        `${hidden === 1 ? 'is' : 'are'} counted but not shown.`
      : null;

  return (
    <div className="border-b border-divider px-4 py-3">
      <p className="text-sm text-white">{headline}</p>
      {coverage && <p className="mt-1 text-sm text-[#8a93a5]">{coverage}</p>}
      {truncation && <p className="mt-1 text-sm text-[#8a93a5]">{truncation}</p>}
      <p className="mt-2 text-xs text-[#6e7787]">{INCLUSION_TIMELINE_NOTE}</p>
    </div>
  );
}

function TimelineTable({ data }: { data: BlobInclusionResponse }) {
  const skipped = React.useMemo(() => sortTimelineBlocks(data.skipped), [data.skipped]);
  const included = data.included;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-divider">
            <th className={TH_CLASS}>Block</th>
            <th className={TH_CLASS}>Builder</th>
            <th className={TH_CLASS}>Blobs</th>
            <th className={TH_CLASS}>Blob base fee</th>
            <th className={TH_CLASS} title={WAITED_TOOLTIP}>
              Waited
            </th>
            <th className={TH_CLASS}>Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider/80">
          {skipped.map((block) => (
            <tr key={block.block_number}>
              <BlockCells block={block} />
              <td className={`${TD_CLASS} tabular-nums`}>
                {formatTimeToInclusion(block.waited_ms)}
              </td>
              <td className="py-2 px-3">
                <CandidateReasonBadge reason={block.reason} />
              </td>
            </tr>
          ))}
          {included && (
            <tr className="bg-[#141a2e]" data-testid="included-block">
              <BlockCells block={included} />
              <td className={`${TD_CLASS} tabular-nums`} title={TIME_TO_INCLUSION_TOOLTIP}>
                {formatTimeToInclusion(data.time_to_inclusion_ms)}
              </td>
              <td className="py-2 px-3">
                <span
                  className="inline-block whitespace-nowrap rounded border border-green-300 px-2 py-0.5 text-xs text-green-300"
                  title={
                    included.tx_index === undefined
                      ? 'The block that carried this transaction'
                      : `The block that carried this transaction, at position #${included.tx_index}`
                  }
                >
                  Included
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * How long this transaction waited for a block and which blocks passed it by
 * while it did, from the indexer's inclusion timeline endpoint.
 *
 * Supplementary to the transaction itself, so it renders nothing while
 * loading, when the fetch fails, or when the indexer has nothing to say (a
 * transaction never seen pending, with no block recorded), rather than
 * putting an empty state on every transaction page. A pending transaction is
 * polled a block at a time so the timeline grows as blocks pass it by.
 */
export default function TransactionInclusion({ txHash }: { txHash: string }) {
  const { selectedNetwork } = useNetwork();
  const isValidHash = TX_HASH_PATTERN.test(txHash);
  const normalizedHash = txHash.toLowerCase();

  const { data, isLoading, error } = useApiData<BlobInclusionResponse | null>(
    () =>
      isValidHash
        ? api.getBlobInclusion(normalizedHash, selectedNetwork.apiParam)
        : Promise.resolve(null),
    ['blob-inclusion', selectedNetwork.apiParam, normalizedHash],
    {
      enabled: isValidHash,
      // A confirmed wait is settled. Anything else (pending, or a row the
      // indexer has not written yet) is still moving.
      refetchInterval: (query) =>
        !isValidHash || query.state.data?.confirmed ? false : SECONDS_PER_BLOCK * 1000,
    }
  );

  if (error || isLoading || !data || !Array.isArray(data.skipped)) return null;
  if (!data.included && !data.window) return null;

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Inclusion timeline</h2>
      <div className="rounded-lg border border-divider bg-[#0f1322]">
        <Summary data={data} />
        {(data.skipped.length > 0 || data.included) && <TimelineTable data={data} />}
      </div>
    </section>
  );
}
