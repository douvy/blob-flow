"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ExternalLink } from 'lucide-react';
import DataStateWrapper from '@/components/DataStateWrapper';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { useNetwork } from '@/hooks/useNetwork';
import { UserResponse, BlobResponse } from '@/types';
import {
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobTotalCost,
  formatBlobWeiCost,
  formatCostEthOrWei,
  formatFeeHeadroom,
  getAttributionImageSrc,
  getAttributionInitial,
  getAttributionSuggestionUrl,
  getBlobCount,
  safeExplorerUrl,
  truncateAddress,
} from '@/utils';
import { RelativeTime } from '@/components/RelativeTime';
import { ATTRIBUTION_CONTRIBUTING_URL, FEE_HEADROOM_TOOLTIP } from '@/constants';

const USER_BLOB_LIMIT = 20;

function truncateTxHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 4)}`;
}

function BlobTable({ blobs, showBlock }: { blobs: BlobResponse[]; showBlock: boolean }) {
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
            const tip = formatBlobFee(blob.tip_per_blob_gas_gwei, blob.tip_per_blob_gas);
            const maxFee = formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas);
            const realizedCost = blob.realized_cost_wei
              ? formatBlobWeiCost(blob.realized_cost_wei)
              : formatBlobTotalCost(blob.total_cost_wei || blob.total_cost_eth);
            const maxCost = formatBlobWeiCost(blob.max_cost_wei);
            const headroom = formatFeeHeadroom(blob.fee_cap_headroom_percent);

            return (
              <tr key={`${blob.tx_hash}-${blob.blob_index}`} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 transition-colors">
                <td className="py-3 px-3 sm:px-4 text-sm font-mono text-white">
                  {blob.transaction_url ? (
                    <a
                      href={blob.transaction_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue hover:underline"
                    >
                      {truncateTxHash(blob.tx_hash)}
                    </a>
                  ) : (
                    <span>{truncateTxHash(blob.tx_hash)}</span>
                  )}
                  <div className="text-xs text-[#8a93a5] mt-1 font-sans whitespace-nowrap">blob #{blob.blob_index}</div>
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
                  <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">tip {tip}</div>
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

export default function UserDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { selectedNetwork } = useNetwork();

  const { data: user, isLoading: userLoading, error: userError } = useApiData<UserResponse>(
    () => api.getUserByAddress(address, selectedNetwork.apiParam),
    ['user', selectedNetwork.apiParam, address]
  );

  const { data: confirmedBlobs, isLoading: blobsLoading, error: blobsError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, true, USER_BLOB_LIMIT, selectedNetwork.apiParam),
    ['user-blobs', selectedNetwork.apiParam, address, 'confirmed', USER_BLOB_LIMIT]
  );

  const { data: mempoolBlobs, isLoading: mempoolLoading, error: mempoolError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, false, USER_BLOB_LIMIT, selectedNetwork.apiParam),
    ['user-blobs', selectedNetwork.apiParam, address, 'mempool', USER_BLOB_LIMIT]
  );

  const [mempoolExpanded, setMempoolExpanded] = useState(false);

  // Roll the pending blobs up into a one-line summary for the collapsed
  // header: dedupe transactions by hash, sum blobs and data across entries.
  const mempoolSummary = useMemo(() => {
    const blobs = mempoolBlobs ?? [];
    const txHashes = new Set<string>();
    let blobCount = 0;
    let blobSizeBytes = 0;
    blobs.forEach((blob) => {
      txHashes.add(blob.tx_hash);
      blobCount += getBlobCount(blob.blob_gas_used, blob.blob_size_bytes);
      blobSizeBytes += blob.blob_size_bytes ?? 0;
    });
    return { txCount: txHashes.size, blobCount, blobSizeBytes };
  }, [mempoolBlobs]);

  // The sample is capped at USER_BLOB_LIMIT rows, so a full sample means the
  // true totals are at least what we counted: mark them as lower bounds.
  const mempoolTruncated = (mempoolBlobs?.length ?? 0) >= USER_BLOB_LIMIT;
  const txDisplay = mempoolTruncated ? `${mempoolSummary.txCount}+` : `${mempoolSummary.txCount}`;
  const mempoolCountsLabel = mempoolError && !mempoolBlobs
    ? 'pending blobs unavailable'
    : !mempoolBlobs
      ? 'loading…'
      : mempoolSummary.txCount === 0
        ? 'no pending blobs'
        : `${txDisplay} tx · ${formatBlobCount(mempoolSummary.blobCount)} · ${formatBlobSize(mempoolSummary.blobSizeBytes)}`;

  const userName = user?.name || truncateAddress(address);
  const userImageSrc = user?.name ? getAttributionImageSrc(user.name) : null;
  // Null when the route param is not a parseable address; the callout then
  // only links to the contribution guide instead of a prefilled file.
  const attributionSuggestionUrl = getAttributionSuggestionUrl(
    address,
    selectedNetwork.apiParam
  );

  // The backend user endpoint carries no explorer link, but every blob from
  // this address shares one, so surface it from whichever list has loaded.
  // Validated via safeExplorerUrl to avoid rendering non-http(s) hrefs.
  const explorerUrl =
    safeExplorerUrl(
      confirmedBlobs?.find((blob) => blob.from_address_url)?.from_address_url ||
        mempoolBlobs?.find((blob) => blob.from_address_url)?.from_address_url
    ) ?? null;

  const loadingStats = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#26282e] animate-pulse" />
        <div className="h-8 bg-[#26282e] rounded w-40 animate-pulse" />
      </div>
      <div className="h-5 bg-[#26282e] rounded w-80 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
            <div className="h-3 bg-[#26282e] rounded w-16 animate-pulse mb-2" />
            <div className="h-6 bg-[#26282e] rounded w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  const loadingTable = (
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link href="/" className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <DataStateWrapper isLoading={userLoading} error={userError} loadingComponent={loadingStats}>
          {user && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                {user.name && userImageSrc ? (
                  <Image
                    src={userImageSrc}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-500 inline-flex items-center justify-center text-sm text-white font-medium">
                    {getAttributionInitial(userName)}
                  </span>
                )}
                <h1 className="text-3xl font-windsor-bold text-white">{userName}</h1>
              </div>
              <div className="flex items-center gap-2 mb-6">
                <p className="text-bodyText font-mono text-sm break-all">{address}</p>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue hover:underline text-sm shrink-0"
                    aria-label="View address on block explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Explorer
                  </a>
                )}
              </div>

              {!user.name && (
                <div className="mb-6 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 p-4">
                  <p className="text-sm text-bodyText">
                    This address isn&apos;t attributed to a known entity yet. If you know
                    which project it belongs to, you can add it to the public blob-list
                    registry.
                    {attributionSuggestionUrl &&
                      ' The suggestion link opens a prefilled entity file on GitHub; committing it starts a pull request.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {attributionSuggestionUrl && (
                      <a
                        href={attributionSuggestionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue hover:underline text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Suggest an attribution
                      </a>
                    )}
                    <a
                      href={ATTRIBUTION_CONTRIBUTING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue hover:underline text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      How attribution works
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Blob Count</div>
                  <div className="text-xl text-white font-medium">{user.blob_count.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Total Cost</div>
                  <div className="text-xl text-white font-medium">{formatCostEthOrWei(user.total_cost_wei || user.total_cost_eth)}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Last Active</div>
                  <div className="text-xl text-white font-medium"><RelativeTime timestamp={user.last_timestamp} /></div>
                </div>
              </div>
            </div>
          )}
        </DataStateWrapper>

        <section className="mb-8">
          <h2 className="m-0">
            <button
              type="button"
              onClick={() => setMempoolExpanded((expanded) => !expanded)}
              aria-expanded={mempoolExpanded}
              aria-controls="pending-blobs-panel"
              className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 py-3 transition-colors hover:from-[#1f2127]/70 hover:to-[#23252b]/70"
            >
              <span className="font-windsor-bold text-xl leading-none text-white pt-[2px]">Pending Blobs</span>
              <span className="text-sm tabular-nums text-[#8a93a5]">
                {mempoolCountsLabel}
                {mempoolError && mempoolBlobs ? ' · refresh failed' : ''}
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-sm text-blue">
                {mempoolExpanded ? 'Hide' : 'Show'}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mempoolExpanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </span>
            </button>
          </h2>
          {mempoolExpanded && (
            <div id="pending-blobs-panel" className="mt-4">
              <DataStateWrapper isLoading={mempoolLoading} error={mempoolError} loadingComponent={loadingTable}>
                {mempoolBlobs && <BlobTable blobs={mempoolBlobs} showBlock={false} />}
              </DataStateWrapper>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-windsor-bold text-white mb-4">Recent Blobs</h2>
          <DataStateWrapper isLoading={blobsLoading} error={blobsError} loadingComponent={loadingTable}>
            {confirmedBlobs && <BlobTable blobs={confirmedBlobs} showBlock={true} />}
          </DataStateWrapper>
        </section>
    </div>
  );
}
