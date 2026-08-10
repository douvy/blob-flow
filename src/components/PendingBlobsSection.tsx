"use client";

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import BlobTable, { BlobTableSkeleton } from '@/components/BlobTable';
import DataStateWrapper from '@/components/DataStateWrapper';
import { BlobResponse } from '@/types';
import { formatBlobCount, formatBlobSize, getBlobCount } from '@/utils';

/**
 * Collapsible mempool section shared by the address and entity pages: a
 * one-line rollup of the pending sample in the header, the full blob table
 * behind the toggle. `limit` is the fetch cap; a sample that fills it means
 * the true totals are at least what was counted, so they render as `N+`.
 */
export default function PendingBlobsSection({
  blobs,
  isLoading,
  error,
  limit,
  showFrom = false,
}: {
  blobs: BlobResponse[] | undefined;
  isLoading: boolean;
  error: Error | null;
  limit: number;
  showFrom?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Roll the pending blobs up into a one-line summary for the collapsed
  // header: dedupe transactions by hash, sum blobs and data across entries.
  const summary = useMemo(() => {
    const list = blobs ?? [];
    const txHashes = new Set<string>();
    let blobCount = 0;
    let blobSizeBytes = 0;
    list.forEach((blob) => {
      txHashes.add(blob.tx_hash);
      blobCount += getBlobCount(blob.blob_gas_used, blob.blob_size_bytes);
      blobSizeBytes += blob.blob_size_bytes ?? 0;
    });
    return { txCount: txHashes.size, blobCount, blobSizeBytes };
  }, [blobs]);

  const truncated = (blobs?.length ?? 0) >= limit;
  const txDisplay = truncated ? `${summary.txCount}+` : `${summary.txCount}`;
  const countsLabel = error && !blobs
    ? 'pending blobs unavailable'
    : !blobs
      ? 'loading…'
      : summary.txCount === 0
        ? 'no pending blobs'
        : `${txDisplay} tx · ${formatBlobCount(summary.blobCount)} · ${formatBlobSize(summary.blobSizeBytes)}`;

  return (
    <section className="mb-8">
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="pending-blobs-panel"
          className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 py-3 transition-colors hover:from-[#1f2127]/70 hover:to-[#23252b]/70"
        >
          <span className="font-windsor-bold text-xl leading-none text-white pt-[2px]">Pending Blobs</span>
          <span className="text-sm tabular-nums text-[#8a93a5]">
            {countsLabel}
            {error && blobs ? ' · refresh failed' : ''}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-sm text-blue">
            {expanded ? 'Hide' : 'Show'}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
        </button>
      </h2>
      {expanded && (
        <div id="pending-blobs-panel" className="mt-4">
          <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={<BlobTableSkeleton />}>
            {blobs && <BlobTable blobs={blobs} showBlock={false} showFrom={showFrom} />}
          </DataStateWrapper>
        </div>
      )}
    </section>
  );
}
