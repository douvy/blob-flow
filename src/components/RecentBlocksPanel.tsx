"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLiveBlockList } from '../hooks/useLiveBlockList';
import DataStateWrapper from './DataStateWrapper';
import { Block } from '../types';
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
  textClass: 'text-amber-200',
};

const UNDER_TARGET_STATE: UsageState = {
  label: 'Under target',
  fillClass: 'bg-green-400',
  textClass: 'text-green-200',
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
      className="relative h-2 overflow-hidden rounded-full bg-[#26282e]"
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

function BlockRow({ block }: { block: Block }) {
  const usage = getBlockUsage(block);
  const fillLabel = usage.maxBlobs > 0 ? `${usage.usedBlobs}/${usage.maxBlobs}` : `${usage.usedBlobs}`;
  const utilization = usage.maxBlobs > 0 ? formatPercent(usage.utilizationPercent, 0) : '-';

  return (
    <Link
      href={`/block/${block.number}`}
      aria-label={`View blob details for block ${block.number}`}
      className="flex items-center gap-3 rounded-md border border-[#292e35] bg-[#17181b] px-3 py-2 transition-colors hover:border-blue/30 hover:bg-[#1d1f23] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
    >
      <div className="grid min-w-0 flex-1 grid-cols-2 sm:grid-cols-[minmax(5.5rem,0.8fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(5.5rem,0.8fr)] items-center gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-[#6e7687]">Block</div>
          <div className="truncate text-sm font-medium text-blue">
            {Number(block.number).toLocaleString()}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-[#6e7687]">
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
          <div className="text-[11px] text-[#6e7687]">Base fee</div>
          <div className="truncate text-sm font-medium text-white">{formatBaseFee(block)}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-[#6e7687]">State</div>
          <div className={`truncate text-sm font-medium ${usage.state.textClass}`}>
            {usage.state.label}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RecentBlocksPanel() {
  const { blocks: displayBlocks, isLoading, error } = useLiveBlockList(HOMEPAGE_BLOCK_ROWS);

  const loadingComponent = (
    <article className="rounded-lg border border-divider bg-[#14161a] p-5">
      <div className="space-y-3">
        {[...Array(HOMEPAGE_BLOCK_ROWS)].map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-md border border-[#292e35] bg-[#17181b] px-3 py-3 animate-pulse"
          >
            <div className="grid min-w-0 flex-1 grid-cols-2 sm:grid-cols-[minmax(5.5rem,0.8fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(5.5rem,0.8fr)] items-center gap-3">
              <div className="h-5 bg-[#26282e] rounded w-20" />
              <div className="h-5 bg-[#26282e] rounded" />
              <div className="h-5 bg-[#26282e] rounded w-24" />
              <div className="h-5 bg-[#26282e] rounded w-20" />
            </div>
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
          className="inline-flex items-center gap-1 text-sm text-blue hover:underline whitespace-nowrap"
        >
          View all blocks <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <DataStateWrapper
        isLoading={isLoading && displayBlocks.length === 0}
        error={displayBlocks.length === 0 ? error : null}
        loadingComponent={loadingComponent}
      >
        <article className="rounded-lg border border-divider bg-[#14161a] p-5">
          <div className="space-y-3">
            {displayBlocks.map((block) => (
              <BlockRow key={block.id} block={block} />
            ))}
          </div>
        </article>
      </DataStateWrapper>
    </section>
  );
}
