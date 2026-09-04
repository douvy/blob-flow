"use client";

import React, { useState } from 'react';
import Link from '@/components/NetworkLink';
import { Block, BlobResponse } from '../types';
import {
  beaconSlotForBlob,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatFeeHeadroom,
  truncateAddress,
  truncateTxHash,
} from '../utils';
import { RelativeTime } from './RelativeTime';
import RawBlobViewer from './RawBlobViewer';
import RawBlobActions from './RawBlobActions';
import AttributionBadge from './AttributionBadge';
import { useRawBlobAvailability } from '../hooks/useRawBlobAvailability';
import { FEE_HEADROOM_TOOLTIP, PRIORITY_FEE_TOOLTIP } from '../constants';

function BlobUserCell({ blob }: { blob: BlobResponse }) {
  const attribution = blob.user_attribution || 'Unknown';

  return (
    <div className="flex items-center min-w-0">
      <AttributionBadge
        user={attribution}
        sizeClass="w-5 h-5"
        className="mr-2"
        textClass="text-[10px]"
      />
      <span className="truncate">{attribution}</span>
    </div>
  );
}

function BlobDetailField({
  label,
  title,
  children,
  monospace = false,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
  monospace?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#6e7787] uppercase tracking-wider">{label}</dt>
      <dd
        className={`mt-1 text-sm text-white truncate ${monospace ? 'font-mono' : ''}`}
        title={title}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * A blob can be viewed raw when the indexer stored its versioned hash and we
 * can place it in a beacon slot. The raw bytes come from a BlobArchive
 * follower via the /api/raw-blob proxy route.
 */
function canViewRawBlob(blob: BlobResponse): boolean {
  return Boolean(blob.versioned_hash && beaconSlotForBlob(blob) !== null);
}

export function BlobDetailsContent({ block }: { block: Block }) {
  // Only the blob's identity is stored; the blob itself is re-derived from
  // the current block so a live update that replaces the block (reorg)
  // closes the viewer instead of serving bytes from the abandoned fork.
  const [rawBlobKey, setRawBlobKey] = useState<{ txHash: string; blobIndex: number } | null>(
    null
  );
  const rawBlob = rawBlobKey
    ? (block.blobs.find(
        (blob) =>
          blob.tx_hash === rawBlobKey.txHash && blob.blob_index === rawBlobKey.blobIndex
      ) ?? null)
    : null;
  // All blobs in a block share one network; the hook resolves to false until
  // the deployment confirms an archive is configured for it, hiding the
  // feature entirely on deployments without one.
  const archiveAvailable = useRawBlobAvailability(block.blobs[0]?.network_name ?? '');

  return (
    <div className="px-4 sm:px-6 py-4 border-t border-divider">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-medium text-white">Blob details</h3>
        <span className="text-xs text-[#6e7787]">
          {block.blobs.length} blob{block.blobs.length === 1 ? '' : 's'} in block {block.number}
        </span>
      </div>

      {block.blobs.length === 0 ? (
        <div className="mt-4 text-sm text-[#6c727f]">No blob records available for this block.</div>
      ) : (
        <div className="mt-3 divide-y divide-divider/80">
          {block.blobs.map((blob) => {
            const realizedCost = blob.realized_cost_wei
              ? formatBlobWeiCost(blob.realized_cost_wei)
              : formatBlobTotalCost(blob.total_cost_wei || blob.total_cost_eth);
            const maxCost = formatBlobWeiCost(blob.max_cost_wei);
            const baseFee = formatBlobFee(blob.base_fee_per_blob_gas_gwei, blob.base_fee_per_blob_gas);
            const tip = formatBlobFee(blob.priority_fee_per_gas_gwei, blob.priority_fee_per_gas);
            const maxFee = formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas);
            const headroom = formatFeeHeadroom(blob.fee_cap_headroom_percent);

            return (
              <div key={`${blob.tx_hash}-${blob.blob_index}`} className="py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="text-sm font-mono text-white">Blob #{blob.blob_index}</div>
                    {archiveAvailable && canViewRawBlob(blob) && (
                      <RawBlobActions
                        blob={blob}
                        onViewRaw={() =>
                          setRawBlobKey({ txHash: blob.tx_hash, blobIndex: blob.blob_index })
                        }
                      />
                    )}
                  </div>
                  <BlobUserCell blob={blob} />
                </div>
                <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
                  <BlobDetailField label="Tx Hash" title={blob.tx_hash} monospace>
                    <Link
                      href={`/tx/${blob.tx_hash}`}
                      className="text-blue hover:underline"
                      aria-label={`Blob transaction ${blob.tx_hash}`}
                    >
                      {truncateTxHash(blob.tx_hash)}
                    </Link>
                  </BlobDetailField>
                  <BlobDetailField label="From" title={blob.from_address} monospace>
                    {blob.from_address_url ? (
                      <a
                        href={blob.from_address_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue hover:underline"
                      >
                        {truncateAddress(blob.from_address)}
                      </a>
                    ) : (
                      truncateAddress(blob.from_address)
                    )}
                  </BlobDetailField>
                  <BlobDetailField label="Size">{formatBlobSize(blob.blob_size_bytes)}</BlobDetailField>
                  <BlobDetailField label="Cost" title={realizedCost}>
                    {realizedCost}
                  </BlobDetailField>
                  <BlobDetailField label="Max Cost" title={maxCost}>
                    {maxCost}
                  </BlobDetailField>
                  <BlobDetailField label="Base Fee" title={baseFee}>
                    {baseFee}
                  </BlobDetailField>
                  <BlobDetailField label="Exec Tip" title={PRIORITY_FEE_TOOLTIP}>
                    {tip}
                  </BlobDetailField>
                  <BlobDetailField label="Max Fee" title={maxFee}>
                    {maxFee}
                  </BlobDetailField>
                  <BlobDetailField label="Headroom" title={FEE_HEADROOM_TOOLTIP}>{headroom}</BlobDetailField>
                  <BlobDetailField label="Time"><RelativeTime timestamp={blob.timestamp} /></BlobDetailField>
                  <BlobDetailField label="Status">
                    {blob.confirmed ? 'Confirmed' : 'Pending'}
                  </BlobDetailField>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <RawBlobViewer blob={rawBlob} onClose={() => setRawBlobKey(null)} />
    </div>
  );
}
