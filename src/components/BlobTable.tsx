"use client";

import Link from '@/components/NetworkLink';
import { RelativeTime } from '@/components/RelativeTime';
import { FEE_HEADROOM_TOOLTIP, PRIORITY_FEE_TOOLTIP } from '@/constants';
import { BlobResponse } from '@/types';
import {
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatFeeHeadroom,
  getBlobCount,
  truncateAddress,
  truncateTxHash,
} from '@/utils';

/**
 * Blob list shared by the address and entity pages. `showBlock` adds the
 * including-block column (confirmed lists only); `showFrom` adds a sender
 * line under the tx hash for lists that aggregate several addresses, so a
 * row still says which one posted it.
 */
export default function BlobTable({
  blobs,
  showBlock,
  showFrom = false,
}: {
  blobs: BlobResponse[];
  showBlock: boolean;
  showFrom?: boolean;
}) {
  const txWidth = showBlock ? 'w-[24%]' : 'w-[28%]';
  const blockWidth = 'w-[12%]';
  const sizeWidth = showBlock ? 'w-[14%]' : 'w-[16%]';
  const feesWidth = showBlock ? 'w-[18%]' : 'w-[20%]';
  const costWidth = showBlock ? 'w-[20%]' : 'w-[24%]';

  if (blobs.length === 0) {
    return (
      <div className="text-center py-8 border border-divider rounded-lg bg-gradient-to-r from-[#17181b] to-[#141519]/60">
        <p className="text-[#6c727f]">No blobs found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className={`py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider ${txWidth}`}>Tx Hash</th>
            {showBlock && (
              <th className={`hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider ${blockWidth}`}>Block</th>
            )}
            <th className={`py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider ${sizeWidth}`}>Size</th>
            <th className={`hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider ${feesWidth}`}>Fees</th>
            <th className={`py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider ${costWidth}`}>Cost</th>
            <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {blobs.map((blob) => {
            const blobCount = getBlobCount(blob.blob_gas_used, blob.blob_size_bytes);
            const baseFee = formatBlobFee(blob.base_fee_per_blob_gas_gwei, blob.base_fee_per_blob_gas);
            const tip = formatBlobFee(blob.priority_fee_per_gas_gwei, blob.priority_fee_per_gas);
            const maxFee = formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas);
            const realizedCost = blob.realized_cost_wei
              ? formatBlobWeiCost(blob.realized_cost_wei)
              : formatBlobTotalCost(blob.total_cost_wei || blob.total_cost_eth);
            const maxCost = formatBlobWeiCost(blob.max_cost_wei);
            const headroom = formatFeeHeadroom(blob.fee_cap_headroom_percent);

            return (
              <tr key={`${blob.tx_hash}-${blob.blob_index}`} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 transition-colors">
                <td className="py-3 px-3 sm:px-4 text-sm font-mono text-white">
                  <Link
                    href={`/tx/${blob.tx_hash}`}
                    className="text-blue hover:underline"
                    title={blob.tx_hash}
                    aria-label={`Blob transaction ${blob.tx_hash}`}
                  >
                    {truncateTxHash(blob.tx_hash)}
                  </Link>
                  <div className="text-xs text-[#8a93a5] mt-1 font-sans whitespace-nowrap">blob #{blob.blob_index}</div>
                  {showFrom && (
                    <div className="text-xs text-[#8a93a5] mt-1 font-sans whitespace-nowrap">
                      from{' '}
                      <Link
                        href={`/user/${blob.from_address}`}
                        className="text-blue hover:underline font-mono"
                        title={blob.from_address}
                      >
                        {truncateAddress(blob.from_address)}
                      </Link>
                    </div>
                  )}
                  {showBlock && (
                    <div className="text-xs text-[#8a93a5] mt-1 font-sans sm:hidden">
                      block{' '}
                      <Link
                        href={`/block/${blob.block_number}`}
                        className="text-blue hover:underline"
                      >
                        {blob.block_number}
                      </Link>
                    </div>
                  )}
                  <div className="text-xs text-[#8a93a5] mt-1 font-sans whitespace-nowrap lg:hidden"><RelativeTime timestamp={blob.timestamp} /></div>
                </td>
                {showBlock && (
                  <td className={`hidden sm:table-cell py-3 px-3 sm:px-4 text-sm text-white ${blockWidth}`}>
                    <Link
                      href={`/block/${blob.block_number}`}
                      className="text-blue hover:underline"
                    >
                      {blob.block_number}
                    </Link>
                  </td>
                )}
                <td className="py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">
                  <div>{formatBlobCount(blobCount)}</div>
                  <div className="text-xs text-[#8a93a5] mt-1">{formatBlobSize(blob.blob_size_bytes)}</div>
                </td>
                <td className="hidden md:table-cell py-3 px-3 sm:px-4 text-sm text-white">
                  <div className="whitespace-nowrap">{baseFee}</div>
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap" title={PRIORITY_FEE_TOOLTIP}>exec tip {tip}</div>
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">max {maxFee}</div>
                </td>
                <td className="py-3 px-3 sm:px-4 text-sm text-white">
                  <div className="whitespace-nowrap">{realizedCost}</div>
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">max {maxCost}</div>
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap" title={FEE_HEADROOM_TOOLTIP}>{headroom} room</div>
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap md:hidden">{baseFee}</div>
                </td>
                <td className="hidden lg:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap"><RelativeTime timestamp={blob.timestamp} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Placeholder matching BlobTable's confirmed-list column layout. */
export function BlobTableSkeleton() {
  return (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Tx Hash</th>
            <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Block</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Size</th>
            <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Fees</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Cost</th>
            <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
              <td className="py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-28 animate-pulse" /></td>
              <td className="hidden sm:table-cell py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-16 animate-pulse" /></td>
              <td className="py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-14 animate-pulse" /></td>
              <td className="hidden md:table-cell py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-20 animate-pulse" /></td>
              <td className="py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-20 animate-pulse" /></td>
              <td className="hidden lg:table-cell py-3 px-3 sm:px-4"><div className="h-5 bg-[#26282e] rounded w-16 animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
