"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import React from 'react';
import { MEMPOOL_SAMPLE_LIMIT } from '../constants';
import { useMempoolLiveList } from '../hooks/useMempoolLiveList';
import { useNetwork } from '../hooks/useNetwork';
import {
  MEMPOOL_PRIVATE_CAVEAT,
  aggregateMempoolAttribution,
} from '../lib/mempoolAttribution';
import { formatBlobCount, formatBlobSize } from '../utils';
import AttributionBadge from './AttributionBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const TOOLTIP_GROUP_LIMIT = 6;
const ICON_CLUSTER_LIMIT = 4;

/**
 * One-line mempool status for the homepage. The mempool changes too fast for
 * a table to sit mid-page without constant layout shift, so this stays a
 * fixed-height strip: hover for the per-sender breakdown, click through to
 * /mempool for the full view.
 */
export default function MempoolSummary() {
  const { selectedNetwork } = useNetwork();
  const { transactions, truncated, isLoading, error } = useMempoolLiveList(
    MEMPOOL_SAMPLE_LIMIT,
    selectedNetwork.apiParam
  );

  const summary = React.useMemo(
    () => aggregateMempoolAttribution(transactions ?? []),
    [transactions]
  );

  if (!transactions && isLoading) {
    return (
      <section className="pt-2">
        <div className="h-[46px] animate-pulse rounded-lg border border-divider bg-[#14161a]" />
      </section>
    );
  }

  // When the sample is truncated the true totals are at least what we
  // counted, so mark them as lower bounds.
  const txDisplay = truncated ? `${summary.txCount}+` : `${summary.txCount}`;
  const countsLabel = !transactions
    ? 'pending transactions unavailable'
    : summary.txCount === 0 && !truncated
      ? 'no pending blob transactions'
      : `${txDisplay} tx · ${formatBlobCount(summary.blobCount)} · ${formatBlobSize(summary.blobSizeBytes)}`;

  const topGroups = summary.groups.slice(0, ICON_CLUSTER_LIMIT);
  const extraGroupCount = summary.groups.length - topGroups.length;

  const line = (
    <Link
      href="/mempool"
      aria-label={`Mempool: ${countsLabel}. View details.`}
      className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 py-3 transition-colors hover:from-[#1f2127]/70 hover:to-[#23252b]/70"
    >
      <span className="font-windsor-bold text-xl leading-none text-white pt-[2px]">Mempool</span>
      <span className="text-sm tabular-nums text-[#8a93a5]">
        {countsLabel}
        {error && transactions ? ' · refresh failed' : ''}
      </span>
      <span className="ml-auto flex items-center gap-3">
        {topGroups.length > 0 && (
          <span className="hidden items-center sm:flex" aria-hidden="true">
            {topGroups.map((group) => (
              <span
                key={group.user}
                className="-ml-1.5 flex rounded-full ring-2 ring-[#17181b] first:ml-0"
                title={group.user}
              >
                <AttributionBadge user={group.user} sizeClass="h-5 w-5" />
              </span>
            ))}
            {extraGroupCount > 0 && (
              <span className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#26282e] text-[9px] text-[#8a93a5] ring-2 ring-[#17181b]">
                +{extraGroupCount}
              </span>
            )}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-sm text-blue">
          Details
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
    </Link>
  );

  if (!transactions) {
    return <section className="pt-2">{line}</section>;
  }

  return (
    <section className="pt-2">
      <Tooltip>
        <TooltipTrigger asChild>{line}</TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="w-80 max-w-[calc(100vw-2rem)] px-3 py-2.5">
          <div className="space-y-1.5">
            {summary.groups.length === 0 && (
              <p className="text-xs text-[#8a93a5]">No pending blob transactions right now.</p>
            )}
            {summary.groups.slice(0, TOOLTIP_GROUP_LIMIT).map((group) => (
              <div key={group.user} className="flex items-center gap-2 text-xs">
                <AttributionBadge user={group.user} sizeClass="h-4 w-4" />
                <span className="flex-1 truncate text-white">{group.user}</span>
                <span className="whitespace-nowrap tabular-nums text-[#8a93a5]">
                  {group.txCount} tx · {formatBlobCount(group.blobCount)} · {formatBlobSize(group.blobSizeBytes)}
                </span>
              </div>
            ))}
            {summary.groups.length > TOOLTIP_GROUP_LIMIT && (
              <p className="text-xs text-[#8a93a5]">
                +{summary.groups.length - TOOLTIP_GROUP_LIMIT} more senders
              </p>
            )}
          </div>
          <p className="mt-2 border-t border-divider pt-2 text-[11px] leading-relaxed text-[#8a93a5]">
            {MEMPOOL_PRIVATE_CAVEAT}
          </p>
        </TooltipContent>
      </Tooltip>
    </section>
  );
}
