"use client";

import React from 'react';
import Image from 'next/image';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { Block, BlobResponse, LatestBlocksResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatBlobCount,
  formatBlobSize,
  formatCostEthOrWei,
  formatFeeHeadroom,
  formatGwei,
  formatUtilizationPercent,
  formatWeiToEth,
  formatWeiToGwei,
  getAttributionImageSrc,
  getAttributionInitial,
  truncateAddress,
} from '../utils';
import { useBlobWebSocket } from '../contexts/LiveDataContext';
import { transformNewBlockData } from '../lib/api/blocks';
import { formatRelativeTime } from '../lib/api/core';
import { DASHBOARD_LATEST_BLOB_LIMIT, LATEST_BLOCK_ROWS } from '../constants';

function getBlockDetailsId(blockId: number): string {
  return `block-${blockId}-blob-details`;
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 4)}`;
}

function safeFormat(formatter: () => string): string {
  try {
    return formatter();
  } catch {
    return '-';
  }
}

function formatBlobFee(gweiValue?: string, weiValue?: string): string {
  if (gweiValue) return safeFormat(() => formatGwei(gweiValue));
  if (weiValue) return safeFormat(() => formatWeiToGwei(weiValue));
  return '-';
}

function formatBlobWeiCost(weiValue?: string): string {
  if (!weiValue) return '-';
  return safeFormat(() => formatWeiToEth(weiValue, true));
}

function formatBlobTotalCost(totalCost?: string): string {
  if (!totalCost) return '-';
  if (totalCost.includes('.')) return safeFormat(() => formatCostEthOrWei(totalCost));
  return formatBlobWeiCost(totalCost);
}

function formatBlockBaseFee(block: Block): string {
  if (!block.baseFeeGwei || block.baseFeeGwei === '0') return '-';
  return safeFormat(() => formatGwei(block.baseFeeGwei));
}

function AttributionDisplay({ attribution }: { attribution: string[] }) {
  if (attribution.length === 1) {
    const imageSrc = getAttributionImageSrc(attribution[0]);

    return (
      <div className="flex items-center min-w-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={attribution[0]}
            width={20}
            height={20}
            className="inline-block w-5 h-5 mr-2 shrink-0"
          />
        ) : (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 bg-gray-500 text-[10px] text-white font-medium shrink-0">
            {getAttributionInitial(attribution[0])}
          </span>
        )}
        <span className="truncate">{attribution[0]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center min-w-0">
      <div className="flex -space-x-2">
        {attribution.map((attr) => {
          const imageSrc = getAttributionImageSrc(attr);

          return imageSrc ? (
            <Image
              key={attr}
              src={imageSrc}
              alt={attr}
              width={20}
              height={20}
              className="inline-block w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-[1.25rem] min-h-[1.25rem]"
              title={attr}
            />
          ) : (
            <span
              key={attr}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-[1.25rem] min-h-[1.25rem] bg-gray-500 text-[10px] text-white font-medium"
              title={attr}
            >
              {getAttributionInitial(attr)}
            </span>
          );
        })}
      </div>
      <span className="whitespace-nowrap text-sm text-white ml-5">
        {attribution.length} networks
      </span>
    </div>
  );
}

function BlobUserCell({ blob }: { blob: BlobResponse }) {
  const attribution = blob.user_attribution || 'Unknown';
  const imageSrc = getAttributionImageSrc(attribution);

  return (
    <div className="flex items-center min-w-0">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={attribution}
          width={20}
          height={20}
          className="inline-block w-5 h-5 mr-2 shrink-0"
        />
      ) : (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 bg-gray-500 text-[10px] text-white font-medium shrink-0">
          {getAttributionInitial(attribution)}
        </span>
      )}
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

function BlobDetailsRow({ block }: { block: Block }) {
  return (
    <tr id={getBlockDetailsId(block.id)} className="bg-[#111522]">
      <td colSpan={5} className="p-0">
        <div className="px-4 sm:px-6 py-4 border-t border-dividerBlue/50">
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
                  : formatBlobTotalCost(blob.total_cost_eth);
                const maxCost = formatBlobWeiCost(blob.max_cost_wei);
                const baseFee = formatBlobFee(blob.base_fee_per_blob_gas_gwei, blob.base_fee_per_blob_gas);
                const tip = formatBlobFee(blob.tip_per_blob_gas_gwei, blob.tip_per_blob_gas);
                const maxFee = formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas);
                const headroom = formatFeeHeadroom(blob.fee_cap_headroom_percent);

                return (
                  <div key={`${blob.tx_hash}-${blob.blob_index}`} className="py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm font-mono text-white">Blob #{blob.blob_index}</div>
                      <BlobUserCell blob={blob} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
                      <BlobDetailField label="Tx Hash" title={blob.tx_hash} monospace>
                        {blob.transaction_url ? (
                          <a
                            href={blob.transaction_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue hover:underline"
                          >
                            {truncateTxHash(blob.tx_hash)}
                          </a>
                        ) : (
                          truncateTxHash(blob.tx_hash)
                        )}
                      </BlobDetailField>
                      <BlobDetailField label="From" title={blob.from_address} monospace>
                        {blob.from_address_url ? (
                          <a
                            href={blob.from_address_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue hover:underline"
                          >
                            {truncateAddress(blob.from_address)}
                          </a>
                        ) : (
                          truncateAddress(blob.from_address)
                        )}
                      </BlobDetailField>
                      <BlobDetailField label="Size">
                        {formatBlobSize(blob.blob_size_bytes)}
                      </BlobDetailField>
                      <BlobDetailField label="Cost" title={realizedCost}>
                        {realizedCost}
                      </BlobDetailField>
                      <BlobDetailField label="Max Cost" title={maxCost}>
                        {maxCost}
                      </BlobDetailField>
                      <BlobDetailField label="Base Fee" title={baseFee}>
                        {baseFee}
                      </BlobDetailField>
                      <BlobDetailField label="Tip" title={tip}>
                        {tip}
                      </BlobDetailField>
                      <BlobDetailField label="Max Fee" title={maxFee}>
                        {maxFee}
                      </BlobDetailField>
                      <BlobDetailField label="Headroom">
                        {headroom}
                      </BlobDetailField>
                      <BlobDetailField label="Time">
                        {formatRelativeTime(blob.timestamp)}
                      </BlobDetailField>
                      <BlobDetailField label="Status">
                        {blob.confirmed ? 'Confirmed' : 'Pending'}
                      </BlobDetailField>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function LatestBlocksTable() {
  const { selectedNetwork } = useNetwork();
  const { latestEvents } = useBlobWebSocket();
  const [expandedBlockId, setExpandedBlockId] = React.useState<number | null>(null);

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(DASHBOARD_LATEST_BLOB_LIMIT, selectedNetwork.apiParam),
    undefined,
    selectedNetwork.apiParam
  );
  const displayData = React.useMemo<LatestBlocksResponse | undefined>(() => {
    if (!latestEvents.new_block) {
      return data ? { data: data.data.slice(0, LATEST_BLOCK_ROWS) } : undefined;
    }

    const liveBlock = transformNewBlockData(latestEvents.new_block.data);
    return {
      data: [
        liveBlock,
        ...(data?.data || []).filter((block) => block.number !== liveBlock.number),
      ].slice(0, LATEST_BLOCK_ROWS),
    };
  }, [data, latestEvents.new_block]);

  const toggleBlock = React.useCallback((blockId: number) => {
    setExpandedBlockId((currentBlockId) => currentBlockId === blockId ? null : blockId);
  }, []);

  const handleBlockRowKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLTableRowElement>,
    blockId: number
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleBlock(blockId);
    }
  }, [toggleBlock]);

  React.useEffect(() => {
    setExpandedBlockId(null);
  }, [selectedNetwork.apiParam]);

  React.useEffect(() => {
    if (expandedBlockId === null || !displayData) return;

    const expandedBlockExists = displayData.data.some((block) => block.id === expandedBlockId);
    if (!expandedBlockExists) {
      setExpandedBlockId(null);
    }
  }, [displayData, expandedBlockId]);

  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[28%]">Block</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[18%]">Blobs</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[26%]">Util.</th>
            <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Base Fee</th>
            <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Users</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse mb-2"></div>
                <div className="h-3 bg-[#202538] rounded w-16 animate-pulse sm:hidden"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-12 animate-pulse mb-2"></div>
                <div className="h-2 bg-[#202538] rounded w-24 animate-pulse"></div>
              </td>
              <td className="hidden sm:table-cell py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-16 animate-pulse"></div>
              </td>
              <td className="hidden lg:table-cell py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Latest Blocks</h2>

      <DataStateWrapper
        isLoading={isLoading && !displayData}
        error={displayData ? null : error}
        loadingComponent={loadingComponent}
      >
        {displayData && (
          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="min-w-full overflow-hidden table-fixed">
              <thead>
                <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[28%]">Block</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[18%]">Blobs</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[26%]">Util.</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Base Fee</th>
                  <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {displayData.data.map((block: Block) => {
                  const isExpanded = expandedBlockId === block.id;
                  const detailsId = getBlockDetailsId(block.id);
                  const baseFee = formatBlockBaseFee(block);

                  return (
                    <React.Fragment key={block.id}>
                      <tr
                        className={`bg-gradient-to-r transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset ${
                          isExpanded
                            ? 'from-[#202538]/80 to-[#242731]/70'
                            : 'from-[#161a29] to-[#19191e]/60 hover:from-[#202538]/70 hover:to-[#242731]/70'
                        }`}
                        onClick={() => toggleBlock(block.id)}
                        onKeyDown={(event) => handleBlockRowKeyDown(event, block.id)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        aria-label={`View blob details for block ${block.number}`}
                      >
                        <td className="py-3 px-3 sm:px-4 text-sm font-medium text-white">
                          <div className="flex items-center gap-2 min-w-0">
                            <i
                              className={`fa-regular fa-chevron-right text-[10px] text-[#6e7787] transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              aria-hidden="true"
                            />
                            {block.blockUrl ? (
                              <a
                                href={block.blockUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {Number(block.number).toLocaleString()}
                              </a>
                            ) : (
                              <span>{Number(block.number).toLocaleString()}</span>
                            )}
                          </div>
                          <div className="text-xs text-[#8a93a5] mt-1 font-normal whitespace-nowrap">{block.timestamp}</div>
                          <div className="text-xs text-[#8a93a5] mt-1 font-normal sm:hidden">{baseFee}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-sm text-white">
                          <div className="whitespace-nowrap">{formatBlobCount(block.blobCount)}</div>
                          <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">
                            {block.availableBlobs}/{block.maxBlobs} open
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-sm text-white">
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">{formatUtilizationPercent(block.utilizationPercent)}</span>
                            {block.isFull && (
                              <span className="text-[10px] uppercase tracking-wider text-[#ff8f8f]">Full</span>
                            )}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#2a2f37] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${block.isAboveTarget ? 'bg-[#ffb86b]' : 'bg-blue'}`}
                              style={{ width: `${Math.min(block.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">target {block.targetBlobs}</div>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">{baseFee}</td>
                        <td className="hidden lg:table-cell py-3 px-3 sm:px-4 text-sm text-white">
                          <AttributionDisplay attribution={block.attribution} />
                        </td>
                      </tr>
                      {isExpanded && <BlobDetailsRow block={block} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
