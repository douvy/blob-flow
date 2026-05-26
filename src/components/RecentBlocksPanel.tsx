"use client";

import React from 'react';
import Link from 'next/link';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { useNetwork } from '../hooks/useNetwork';
import { useLatestBlobEvent } from '../contexts/LiveDataContext';
import { transformNewBlockData } from '../lib/api/blocks';
import DataStateWrapper from './DataStateWrapper';
import { BlobDetailsContent } from './BlobDetailsContent';
import { Block, LatestBlocksResponse } from '../types';
import { formatBlobFee, formatPercent } from '../utils';
import { HOMEPAGE_BLOCK_ROWS } from '../constants';

interface UsageState {
  label: 'Above target' | 'Under target';
  fillClass: string;
  textClass: string;
}

interface BlockUsage {
  usedBlobs: number;
  maxBlobs: number;
  targetPercent: number | null;
  utilizationPercent: number;
  state: UsageState;
}

const ABOVE_TARGET_STATE: UsageState = {
  label: 'Above target',
  fillClass: 'bg-amber-300',
  textClass: 'text-amber-300',
};

const UNDER_TARGET_STATE: UsageState = {
  label: 'Under target',
  fillClass: 'bg-green-400',
  textClass: 'text-green-400',
};

function getGasPerBlob(block: Block): number {
  if (block.blobGasTarget > 0 && block.targetBlobs > 0) {
    return block.blobGasTarget / block.targetBlobs;
  }

  if (block.blobGasLimit > 0 && block.maxBlobs > 0) {
    return block.blobGasLimit / block.maxBlobs;
  }

  return 0;
}

function getUsedBlobCount(block: Block): number {
  const gasPerBlob = getGasPerBlob(block);
  if (block.blobGasUsed > 0 && gasPerBlob > 0) {
    return Math.ceil(block.blobGasUsed / gasPerBlob);
  }

  return block.blobCount;
}

function getBlockUsage(block: Block): BlockUsage {
  const usedBlobs = getUsedBlobCount(block);
  const maxBlobs = block.maxBlobs;
  const utilizationPercent = block.blobGasLimit > 0
    ? (block.blobGasUsed / block.blobGasLimit) * 100
    : block.utilizationPercent;
  const targetPercent = block.blobGasLimit > 0 && block.blobGasTarget > 0
    ? (block.blobGasTarget / block.blobGasLimit) * 100
    : block.maxBlobs > 0 && block.targetBlobs > 0
      ? (block.targetBlobs / block.maxBlobs) * 100
      : null;
  const isAboveTarget = block.blobGasTarget > 0
    ? block.blobGasUsed > block.blobGasTarget
    : block.targetBlobs > 0
      ? usedBlobs > block.targetBlobs
      : block.isAboveTarget;

  return {
    usedBlobs,
    maxBlobs,
    targetPercent,
    utilizationPercent,
    state: isAboveTarget ? ABOVE_TARGET_STATE : UNDER_TARGET_STATE,
  };
}

function FullnessBar({
  percent,
  targetPercent,
  state,
}: {
  percent: number;
  targetPercent: number | null;
  state: UsageState;
}) {
  const boundedPercent = Math.min(100, Math.max(0, percent));
  const boundedTargetPercent = targetPercent === null
    ? null
    : Math.min(100, Math.max(0, targetPercent));

  return (
    <div
      className="relative h-2 overflow-hidden rounded-full bg-[#202538]"
      role="meter"
      aria-label={state.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(boundedPercent)}
      aria-valuetext={
        boundedTargetPercent === null
          ? state.label
          : `${state.label}; target at ${Math.round(boundedTargetPercent)}%`
      }
    >
      <div
        className={`h-full rounded-full ${state.fillClass}`}
        style={{ width: `${boundedPercent}%` }}
      />
      {boundedTargetPercent !== null && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-white/90 shadow-[0_0_0_1px_rgba(15,19,34,0.85)]"
          style={{ left: `${boundedTargetPercent}%` }}
          title="Target"
        />
      )}
    </div>
  );
}

function formatBaseFee(block: Block): string {
  if (!block.baseFeeGwei || block.baseFeeGwei === '0') return '-';
  return formatBlobFee(block.baseFeeGwei);
}

function addCapacityFallback(block: Block, fallbackBlock: Block | undefined): Block {
  if (block.maxBlobs > 0 || !fallbackBlock || fallbackBlock.maxBlobs <= 0) {
    return block;
  }

  return {
    ...block,
    blobGasTarget: fallbackBlock.blobGasTarget,
    blobGasLimit: fallbackBlock.blobGasLimit,
    targetBlobs: fallbackBlock.targetBlobs,
    maxBlobs: fallbackBlock.maxBlobs,
  };
}

function BlockRow({
  block,
  isExpanded,
  onToggle,
  onKeyDown,
}: {
  block: Block;
  isExpanded: boolean;
  onToggle: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const detailsId = `recent-block-${block.id}-details`;
  const usage = getBlockUsage(block);
  const fillLabel = usage.maxBlobs > 0 ? `${usage.usedBlobs}/${usage.maxBlobs}` : `${usage.usedBlobs}`;
  const utilization = usage.maxBlobs > 0 ? formatPercent(usage.utilizationPercent, 0) : '-';

  return (
    <div
      className={`rounded-md border transition-colors ${
        isExpanded
          ? 'border-blue/40 bg-[#181d2e]/80'
          : 'border-divider/70 bg-[#111522]/70 hover:border-blue/30 hover:bg-[#181d2e]/60'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        aria-label={`View blob details for block ${block.number}`}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 sm:grid-cols-[1.25rem_minmax(5.5rem,0.8fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(5.5rem,0.8fr)] items-center gap-3 px-3 py-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset rounded-md"
      >
        <i
          className={`hidden sm:inline fa-regular fa-chevron-right text-[10px] text-[#6e7787] transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="text-[11px] text-[#8f9aad]">Block</div>
          <div className="truncate text-sm font-medium text-white">
            <Link
              href={`/block/${block.number}`}
              className="text-blue hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {Number(block.number).toLocaleString()}
            </Link>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-[#8f9aad]">
            <span>{fillLabel} blobs</span>
            <span>{utilization}</span>
          </div>
          <FullnessBar
            percent={usage.utilizationPercent}
            targetPercent={usage.targetPercent}
            state={usage.state}
          />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-[#8f9aad]">Base fee</div>
          <div className="truncate text-sm font-medium text-white">{formatBaseFee(block)}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-[#8f9aad]">State</div>
          <div className={`truncate text-sm font-medium ${usage.state.textClass}`}>
            {usage.state.label}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div id={detailsId} className="bg-[#0f1322] rounded-b-md">
          <BlobDetailsContent block={block} />
        </div>
      )}
    </div>
  );
}

export default function RecentBlocksPanel() {
  const { selectedNetwork } = useNetwork();
  const liveBlockEvent = useLatestBlobEvent('new_block');
  const [expandedBlockId, setExpandedBlockId] = React.useState<number | null>(null);
  const [networkKey, setNetworkKey] = React.useState(selectedNetwork.apiParam);

  if (networkKey !== selectedNetwork.apiParam) {
    setNetworkKey(selectedNetwork.apiParam);
    setExpandedBlockId(null);
  }

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(HOMEPAGE_BLOCK_ROWS, selectedNetwork.apiParam),
    undefined,
    selectedNetwork.apiParam
  );

  const displayBlocks = React.useMemo<Block[]>(() => {
    const baseBlocks = data?.data ?? [];
    if (!liveBlockEvent) return baseBlocks.slice(0, HOMEPAGE_BLOCK_ROWS);

    const liveBlock = addCapacityFallback(
      transformNewBlockData(liveBlockEvent.data),
      baseBlocks[0]
    );
    return [
      liveBlock,
      ...baseBlocks.filter((block) => block.number !== liveBlock.number),
    ].slice(0, HOMEPAGE_BLOCK_ROWS);
  }, [data, liveBlockEvent]);

  const toggleBlock = React.useCallback((blockId: number) => {
    setExpandedBlockId((current) => (current === blockId ? null : blockId));
  }, []);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, blockId: number) => {
      // Only treat Enter/Space as a row toggle when the row itself is the
      // event target. Without this, pressing Enter/Space while focused on a
      // nested interactive element (e.g. the block-number link) bubbles up
      // here, preventDefault swallows the link's activation, and the row
      // toggles unexpectedly.
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleBlock(blockId);
      }
    },
    [toggleBlock]
  );

  const loadingComponent = (
    <article className="rounded-lg border border-divider bg-[#161a29]/80 p-5">
      <div className="space-y-3">
        {[...Array(HOMEPAGE_BLOCK_ROWS)].map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-2 sm:grid-cols-[minmax(5.5rem,0.8fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(5.5rem,0.8fr)] items-center gap-3 rounded-md border border-divider/70 bg-[#111522]/70 px-3 py-3 animate-pulse"
          >
            <div className="h-5 bg-[#202538] rounded w-20" />
            <div className="h-5 bg-[#202538] rounded" />
            <div className="h-5 bg-[#202538] rounded w-24" />
            <div className="h-5 bg-[#202538] rounded w-20" />
          </div>
        ))}
      </div>
    </article>
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-windsor-bold text-white">Recent Block Fees</h2>
        <Link
          href="/blocks"
          className="text-sm text-blue hover:underline whitespace-nowrap"
        >
          View all blocks <i className="fa-regular fa-arrow-right text-xs ml-1" aria-hidden="true" />
        </Link>
      </div>

      <DataStateWrapper
        isLoading={isLoading && displayBlocks.length === 0}
        error={displayBlocks.length === 0 ? error : null}
        loadingComponent={loadingComponent}
      >
        <article className="rounded-lg border border-divider bg-[#161a29]/80 p-5">
          <div className="space-y-3">
            {displayBlocks.map((block) => (
              <BlockRow
                key={block.id}
                block={block}
                isExpanded={expandedBlockId === block.id}
                onToggle={() => toggleBlock(block.id)}
                onKeyDown={(event) => handleKeyDown(event, block.id)}
              />
            ))}
          </div>
        </article>
      </DataStateWrapper>
    </section>
  );
}
