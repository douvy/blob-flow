"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { Block, BlobResponse, LatestBlocksResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatBlobFee,
  formatBlobCount,
  formatBlobWeiCost,
  formatUtilizationPercent,
  getAttributionImageSrc,
  getAttributionInitial,
} from '../utils';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';
import { transformNewBlockData } from '../lib/api/blocks';
import { BlobDetailsContent } from './BlobDetailsContent';
import { BLOCKS_PAGE_LIMIT, BLOCKS_PAGE_SIZE } from '../constants';
import { useFlipRows } from '../hooks/useFlipRows';
import { RelativeTime } from './RelativeTime';

function getBlockDetailsId(blockId: number): string {
  return `block-${blockId}-blob-details`;
}

function formatBlockBaseFee(block: Block): string {
  if (!block.baseFeeGwei || block.baseFeeGwei === '0') return '-';
  return formatBlobFee(block.baseFeeGwei);
}

function formatBlockOpenCapacity(block: Block): string {
  if (block.maxBlobs <= 0) return '-';
  return `${block.availableBlobs}/${block.maxBlobs} open`;
}

function formatBlockUtilization(block: Block): string {
  if (block.maxBlobs <= 0) return '-';
  return formatUtilizationPercent(block.utilizationPercent);
}

function formatBlockTarget(block: Block): string {
  if (block.targetBlobs <= 0) return '-';
  return block.targetBlobs.toString();
}

function parseWeiString(value?: string): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

function parseEthToWei(value: string): bigint | null {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;

  const [wholePart, fractionalPart = ''] = value.split('.');
  const paddedFractional = fractionalPart.padEnd(18, '0').slice(0, 18);
  return BigInt(wholePart) * BigInt('1000000000000000000') + BigInt(paddedFractional || '0');
}

function getBlobPaidWei(blob: BlobResponse): bigint | null {
  const realizedCost = parseWeiString(blob.realized_cost_wei);
  if (realizedCost !== null) return realizedCost;

  const totalCostWei = parseWeiString(blob.total_cost_wei);
  if (totalCostWei !== null) return totalCostWei;

  if (!blob.total_cost_eth) return null;
  if (blob.total_cost_eth.includes('.')) return parseEthToWei(blob.total_cost_eth);
  return parseWeiString(blob.total_cost_eth);
}

function formatBlockPaid(block: Block): string {
  let totalWei = BigInt(0);
  let costCount = 0;

  for (const blob of block.blobs) {
    const paidWei = getBlobPaidWei(blob);
    if (paidWei === null) continue;

    totalWei += paidWei;
    costCount += 1;
  }

  if (costCount === 0) return '-';
  return formatBlobWeiCost(totalWei.toString());
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

function BlobDetailsRow({ block }: { block: Block }) {
  return (
    <tr
      id={getBlockDetailsId(block.id)}
      data-row-key={`details-${block.id}`}
      className="bg-[#111522]"
    >
      <td colSpan={6} className="p-0">
        <BlobDetailsContent block={block} />
      </td>
    </tr>
  );
}

export default function LatestBlocksTable() {
  const { selectedNetwork } = useNetwork();
  const liveBlockEvent = useLatestBlobEvent('new_block');
  // Tracks the user's most recent selection per-network: `id` is null when they
  // collapsed the auto-expanded default, otherwise the id they expanded.
  const [userSelection, setUserSelection] = React.useState<{ network: string; id: number | null } | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageNetwork, setPageNetwork] = React.useState(selectedNetwork.apiParam);

  if (pageNetwork !== selectedNetwork.apiParam) {
    setPageNetwork(selectedNetwork.apiParam);
    setPage(1);
  }

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(BLOCKS_PAGE_LIMIT, selectedNetwork.apiParam),
    ['latest-blocks', selectedNetwork.apiParam, BLOCKS_PAGE_LIMIT]
  );
  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  useFlipRows(tbodyRef, selectedNetwork.apiParam);

  const mergedBlocks = React.useMemo<Block[]>(() => {
    const baseBlocks = data?.data ?? [];
    if (!liveBlockEvent) return baseBlocks;

    const liveBlock = transformNewBlockData(liveBlockEvent.data);
    return [
      liveBlock,
      ...baseBlocks.filter((block) => block.number !== liveBlock.number),
    ].slice(0, BLOCKS_PAGE_LIMIT);
  }, [data, liveBlockEvent]);

  const totalPages = Math.max(1, Math.ceil(mergedBlocks.length / BLOCKS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * BLOCKS_PAGE_SIZE;
  const displayData = React.useMemo<LatestBlocksResponse | undefined>(() => {
    if (!mergedBlocks.length) return undefined;
    return { data: mergedBlocks.slice(pageStart, pageStart + BLOCKS_PAGE_SIZE) };
  }, [mergedBlocks, pageStart]);

  // Derive the expanded block id from the user's selection (if it still
  // applies to the current network and the block is still on the page). Rows
  // are collapsed by default, no auto-expand. Doing this in a memo rather
  // than an effect avoids set-state-in-effect.
  const expandedBlockId = React.useMemo(() => {
    if (!displayData) return null;
    if (!userSelection || userSelection.network !== selectedNetwork.apiParam) return null;
    if (userSelection.id === null) return null;
    if (!displayData.data.some((block) => block.id === userSelection.id)) return null;
    return userSelection.id;
  }, [displayData, userSelection, selectedNetwork.apiParam]);

  const toggleBlock = React.useCallback((blockId: number) => {
    setUserSelection((current) => {
      const isOpen =
        current?.network === selectedNetwork.apiParam && current.id === blockId;
      return { network: selectedNetwork.apiParam, id: isOpen ? null : blockId };
    });
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

  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[24%]">Block</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Blobs</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">Util.</th>
            <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[14%] whitespace-nowrap">Base Fee</th>
            <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[13%]">Paid</th>
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
              <td className="hidden md:table-cell py-3 px-3 sm:px-4">
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

  const pageRangeStart = mergedBlocks.length === 0 ? 0 : pageStart + 1;
  const pageRangeEnd = Math.min(pageStart + BLOCKS_PAGE_SIZE, mergedBlocks.length);

  return (
    <div>
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
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[24%]">Block</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Blobs</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">Util.</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[14%] whitespace-nowrap">Base Fee</th>
                  <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[13%]">Paid</th>
                  <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Users</th>
                </tr>
              </thead>
              <tbody ref={tbodyRef} className="divide-y divide-divider">
                {displayData.data.map((block: Block) => {
                  const isExpanded = expandedBlockId === block.id;
                  const detailsId = getBlockDetailsId(block.id);
                  const baseFee = formatBlockBaseFee(block);
                  const hasCapacity = block.maxBlobs > 0;
                  const paidCost = formatBlockPaid(block);

                  return (
                    <React.Fragment key={block.id}>
                      <tr
                        data-row-key={`block-${block.id}`}
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
                            <ChevronRight
                              className={`h-3 w-3 text-[#6e7787] transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                              aria-hidden="true"
                            />
                            <Link
                              href={`/block/${block.number}`}
                              className="text-blue hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {Number(block.number).toLocaleString()}
                            </Link>
                          </div>
                          <div className="text-xs text-[#8a93a5] mt-1 font-normal whitespace-nowrap"><RelativeTime timestamp={block.timestamp} /></div>
                          <div className="text-xs text-[#8a93a5] mt-1 font-normal sm:hidden">{baseFee}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-sm text-white">
                          <div className="whitespace-nowrap">{formatBlobCount(block.blobCount)}</div>
                          <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">
                            {formatBlockOpenCapacity(block)}
                          </div>
                          <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap md:hidden">
                            {paidCost}
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-sm text-white">
                          <div className="flex items-center gap-2">
                            <span className="whitespace-nowrap">{formatBlockUtilization(block)}</span>
                            {block.isFull && (
                              <span className="text-[10px] uppercase tracking-wider text-[#ff8f8f]">Full</span>
                            )}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#2a2f37] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${block.isAboveTarget ? 'bg-[#ffb86b]' : 'bg-blue'}`}
                              style={{ width: hasCapacity ? `${Math.min(block.utilizationPercent, 100)}%` : '0%' }}
                            />
                          </div>
                          <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">target {formatBlockTarget(block)}</div>
                        </td>
                        <td className="hidden sm:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">{baseFee}</td>
                        <td className="hidden md:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">{paidCost}</td>
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

      {displayData && mergedBlocks.length > BLOCKS_PAGE_SIZE && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-[#8a93a5]">
          <div>
            Showing <span className="text-white">{pageRangeStart}</span>
            {pageRangeEnd > pageRangeStart && (
              <>
                {' '}- <span className="text-white">{pageRangeEnd}</span>
              </>
            )}{' '}
            of <span className="text-white">{mergedBlocks.length}</span> blocks
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-divider bg-[#1d1f23] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#23252a]"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Prev
            </button>
            <span className="px-2">
              Page <span className="text-white">{safePage}</span> of{' '}
              <span className="text-white">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-divider bg-[#1d1f23] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#23252a]"
            >
              Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
