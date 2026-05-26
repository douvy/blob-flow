"use client";

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLiveBlobEvent } from '@/contexts/LiveDataContext';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { useApiData } from '@/hooks/useApiData';
import { BlobPricing, BlobPricingRecentBlock } from '@/types';
import { formatGwei, formatNumber, formatPercent } from '@/utils';
import DataStateWrapper from './DataStateWrapper';

const FALLBACK_REFRESH_MS = 60000;

export default function BlobMarketPanels() {
  const { selectedNetwork } = useNetwork();
  const activeNetwork = selectedNetwork.apiParam;

  const fetchPricing = useCallback(
    () => api.getBlobPricing(activeNetwork, 20),
    [activeNetwork]
  );

  const {
    data: pricing,
    isLoading,
    error,
    refetch: refetchPricing,
  } = useApiData<BlobPricing>(
    fetchPricing,
    ['blob-pricing', activeNetwork, 20],
    { refetchInterval: FALLBACK_REFRESH_MS }
  );

  useLiveBlobEvent('new_block', () => {
    void refetchPricing();
  });

  const initialError = pricing ? null : error;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-windsor-bold text-white">Blob Market</h2>
      </div>

      <DataStateWrapper
        isLoading={isLoading && !pricing}
        error={initialError}
        loadingComponent={<BlobMarketSkeleton />}
      >
        {pricing && <CurrentMarketPanel pricing={pricing} />}
      </DataStateWrapper>

      {pricing && error && (
        <p className="mt-3 text-xs text-red-300">
          Refresh failed: {error.message}. Showing the latest available market data.
        </p>
      )}
    </section>
  );
}

function CurrentMarketPanel({ pricing }: { pricing: BlobPricing }) {
  const direction = pricing.marketPressure.predictedDirection.toLowerCase();
  const directionClass = getDirectionClass(direction);
  const latestBlock = pricing.recentBlocks[0];
  const utilizationPercent = latestBlock
    ? formatPercent(latestBlock.utilizationPercent)
    : formatPercent(pricing.currentUtilization * 100);
  const recentStats = useMemo(() => getRecentBlockStats(pricing.recentBlocks), [pricing.recentBlocks]);

  return (
    <article className="rounded-lg border border-divider bg-[#161a29]/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">Current Blob Market</h3>
          <p className="text-sm text-[#8f9aad]">{pricing.networkName} latest block pricing</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs capitalize ${directionClass}`}>
          {direction || 'stable'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <MetricBlock label="Current base fee" value={pricing.currentBaseFee} />
        <MetricBlock label="Predicted next fee" value={pricing.predictedNextFee} />
        <MetricBlock
          label="Latest block fill"
          value={latestBlock ? `${latestBlock.blobCount}/${latestBlock.maxBlobs} blobs` : '-'}
        />
        <MetricBlock label="Recent fee range" value={recentStats.feeRange} />
      </div>

      {latestBlock && (
        <div className="mt-5 border-t border-divider pt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <Link
              href={`/block/${latestBlock.blockNumber}`}
              className="text-blue hover:underline"
            >
              Block {latestBlock.blockNumber.toLocaleString()}
            </Link>
            <span className="text-[#8f9aad]">{utilizationPercent} full</span>
          </div>
          <FullnessBar percent={latestBlock.utilizationPercent} isAboveTarget={latestBlock.isAboveTarget} />
        </div>
      )}

      <div className="mt-5 border-t border-divider pt-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <MetricBlock
            label="Next-block range"
            value={`${pricing.marketPressure.nextBlockFeeEstimate.low} - ${pricing.marketPressure.nextBlockFeeEstimate.high}`}
            compact
          />
          <MetricBlock label="Average fill" value={recentStats.averageFill} compact />
          <MetricBlock
            label="Target / max blobs"
            value={`${pricing.blobParams.target.toLocaleString()} / ${pricing.blobParams.max.toLocaleString()}`}
            compact
          />
          <MetricBlock
            label="Excess blob gas"
            value={formatNumber(pricing.currentExcessGas)}
            compact
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-divider pt-5">
        <MiniStat label="Above target" value={pricing.marketPressure.recentBlocksAboveTarget.toString()} />
        <MiniStat label="Full streak" value={pricing.marketPressure.consecutiveFullBlocks.toString()} />
        <MiniStat
          label="At max"
          value={formatPercent(pricing.marketPressure.percentRecentBlocksAtMaxBlobs)}
        />
      </div>
    </article>
  );
}

function MetricBlock({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-[#8f9aad]">{label}</div>
      <div className={`${compact ? 'text-base' : 'text-2xl'} mt-1 font-medium text-white break-words`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[#8f9aad]">{label}</div>
      <div className="mt-1 text-sm font-medium text-white break-words">{value}</div>
    </div>
  );
}

function FullnessBar({ percent, isAboveTarget }: { percent: number; isAboveTarget: boolean }) {
  const boundedPercent = Math.min(100, Math.max(0, percent));
  const fillClass = isAboveTarget ? 'bg-amber-300' : 'bg-green-400';

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#202538]">
      <div
        className={`h-full rounded-full ${fillClass}`}
        style={{ width: `${boundedPercent}%` }}
      />
    </div>
  );
}

function BlobMarketSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-divider bg-[#161a29]/80 p-5">
      <div className="h-6 w-1/3 rounded bg-[#202538] mb-5" />
      <div className="grid grid-cols-2 gap-5">
        <div className="h-20 rounded bg-[#202538]" />
        <div className="h-20 rounded bg-[#202538]" />
      </div>
      <div className="mt-5 h-28 rounded bg-[#202538]" />
    </div>
  );
}

function getDirectionClass(direction: string): string {
  if (direction === 'up') {
    return 'border-red-300/40 bg-red-300/10 text-red-200';
  }

  if (direction === 'down') {
    return 'border-green-400/40 bg-green-400/10 text-green-300';
  }

  return 'border-[#8f9aad]/40 bg-[#8f9aad]/10 text-[#d7dde8]';
}

function isPlainDecimal(value: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(value);
}

function comparePlainDecimals(left: string, right: string): number {
  const [leftWholeRaw, leftFraction = ''] = left.split('.');
  const [rightWholeRaw, rightFraction = ''] = right.split('.');
  const leftWhole = leftWholeRaw.replace(/^0+(?=\d)/, '');
  const rightWhole = rightWholeRaw.replace(/^0+(?=\d)/, '');

  if (leftWhole.length !== rightWhole.length) {
    return leftWhole.length - rightWhole.length;
  }

  if (leftWhole !== rightWhole) {
    return leftWhole < rightWhole ? -1 : 1;
  }

  const fractionLength = Math.max(leftFraction.length, rightFraction.length);
  const normalizedLeftFraction = leftFraction.padEnd(fractionLength, '0');
  const normalizedRightFraction = rightFraction.padEnd(fractionLength, '0');

  if (normalizedLeftFraction === normalizedRightFraction) {
    return 0;
  }

  return normalizedLeftFraction < normalizedRightFraction ? -1 : 1;
}

function getRecentBlockStats(blocks: BlobPricingRecentBlock[]) {
  if (blocks.length === 0) {
    return {
      averageFill: '-',
      feeRange: '-',
    };
  }

  const averageFill = blocks.reduce((sum, block) => sum + block.utilizationPercent, 0) / blocks.length;
  const fees = blocks
    .map((block) => block.blobBaseFeeGwei)
    .filter(isPlainDecimal);

  if (fees.length === 0) {
    return {
      averageFill: formatPercent(averageFill),
      feeRange: '-',
    };
  }

  const minFee = fees.reduce((min, fee) => comparePlainDecimals(fee, min) < 0 ? fee : min);
  const maxFee = fees.reduce((max, fee) => comparePlainDecimals(fee, max) > 0 ? fee : max);

  return {
    averageFill: formatPercent(averageFill),
    feeRange: comparePlainDecimals(minFee, maxFee) === 0
      ? formatGwei(minFee)
      : `${formatGwei(minFee)} - ${formatGwei(maxFee)}`,
  };
}
