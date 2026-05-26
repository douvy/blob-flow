"use client";

import React from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { Block, BlobResponse, LatestBlocksResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatCostEthOrWei,
  formatWeiToReadable,
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

function formatBlobSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatNumericValue(
  value: string | number | undefined,
  formatter: (rawValue: string | number) => string
): string {
  if (value === undefined || value === '') return '-';

  try {
    return formatter(value);
  } catch {
    return '-';
  }
}

function AttributionDisplay({ attribution }: { attribution: string[] }) {
  if (attribution.length === 1) {
    const imageSrc = getAttributionImageSrc(attribution[0]);

    return (
      <div className="flex items-center">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={attribution[0]}
            width={20}
            height={20}
            className="inline-block w-5 h-5 mr-2"
          />
        ) : (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 bg-gray-500 text-[10px] text-white font-medium">
            {getAttributionInitial(attribution[0])}
          </span>
        )}
        <span className="whitespace-nowrap">{attribution[0]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center">
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
      <span className="whitespace-nowrap text-sm text-white ml-6">
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
      <td colSpan={4} className="p-0">
        <div className="px-6 py-4 border-t border-dividerBlue/50">
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
                const formattedCost = formatNumericValue(blob.total_cost_eth, formatCostEthOrWei);
                const formattedBaseFee = formatNumericValue(blob.base_fee_per_blob_gas, formatWeiToReadable);
                const formattedTip = formatNumericValue(blob.tip_per_blob_gas, formatWeiToReadable);

                return (
                  <div key={`${blob.tx_hash}-${blob.blob_index}`} className="py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm font-mono text-white">Blob #{blob.blob_index}</div>
                      <BlobUserCell blob={blob} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
                      <BlobDetailField label="Tx Hash" title={blob.tx_hash} monospace>
                        {truncateTxHash(blob.tx_hash)}
                      </BlobDetailField>
                      <BlobDetailField label="From" title={blob.from_address} monospace>
                        {truncateAddress(blob.from_address)}
                      </BlobDetailField>
                      <BlobDetailField label="Size">
                        {formatBlobSize(blob.blob_size_bytes)}
                      </BlobDetailField>
                      <BlobDetailField label="Cost" title={formattedCost}>
                        {formattedCost}
                      </BlobDetailField>
                      <BlobDetailField label="Base Fee" title={formattedBaseFee}>
                        {formattedBaseFee}
                      </BlobDetailField>
                      <BlobDetailField label="Tip" title={formattedTip}>
                        {formattedTip}
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
  const [expandedBlock, setExpandedBlock] = React.useState<{ network: string; id: number } | null>(null);

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(DASHBOARD_LATEST_BLOB_LIMIT, selectedNetwork.apiParam),
    ['latest-blocks', selectedNetwork.apiParam, DASHBOARD_LATEST_BLOB_LIMIT]
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

  const expandedBlockId = React.useMemo(() => {
    if (expandedBlock?.network !== selectedNetwork.apiParam || !displayData) {
      return null;
    }

    return displayData.data.some((block) => block.id === expandedBlock.id)
      ? expandedBlock.id
      : null;
  }, [displayData, expandedBlock, selectedNetwork.apiParam]);

  const toggleBlock = React.useCallback((blockId: number) => {
    setExpandedBlock((currentBlock) => (
      currentBlock?.network === selectedNetwork.apiParam && currentBlock.id === blockId
        ? null
        : { network: selectedNetwork.apiParam, id: blockId }
    ));
  }, [selectedNetwork.apiParam]);

  const handleBlockRowKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLTableRowElement>,
    blockId: number
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleBlock(blockId);
    }
  }, [toggleBlock]);

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/5">Block</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">Blobs</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4 whitespace-nowrap">Time</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-2/5">Attribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-24 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, idx) => (
                      <div
                        key={idx}
                        className="inline-block w-5 h-5 rounded-full bg-[#202538] animate-pulse"
                      />
                    ))}
                  </div>
                </div>
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
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/5">Block</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">Blobs</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4 whitespace-nowrap">Time</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-2/5">Attribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {displayData.data.map((block: Block) => {
                  const isExpanded = expandedBlockId === block.id;
                  const detailsId = getBlockDetailsId(block.id);

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
                        <td className="py-3 px-6 text-sm font-medium text-white">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`h-3 w-3 text-[#6e7787] transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              aria-hidden="true"
                            />
                            <span>{block.number}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm text-white">{block.blobCount}</td>
                        <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{block.timestamp}</td>
                        <td className="py-3 px-6 text-sm text-white">
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
