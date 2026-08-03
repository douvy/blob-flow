"use client";

import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useMemo } from 'react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import RecordCard from '@/components/RecordCard';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import type { BlobRecords, RollupMilestone } from '@/types';
import {
  assignSeriesColors,
  formatNumber,
  formatPercent,
  formatScientific,
  formatWeiToEth,
  RUNAWAY_GWEI_THRESHOLD,
} from '@/utils';

const RECORDS_REFRESH_MS = 30_000;

/** Gwei readout tuned for blob fees, which idle at 1 wei (1e-9 Gwei). */
function formatGweiValue(value: number): string {
  if (value === 0) return '0';
  if (value >= RUNAWAY_GWEI_THRESHOLD) return formatScientific(value);
  if (value < 0.000001) return value.toExponential(2);
  if (value < 0.01) return value.toFixed(6);
  return value.toFixed(2);
}

/**
 * Trim a preformatted fee label like "1.68855413317195598 Gwei" to a
 * readable precision, leaving the unit untouched.
 */
function compactFeeLabel(label: string): string {
  const [amount, ...unitParts] = label.split(' ');
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return label;
  const digits = parsed >= 100 ? 0 : parsed >= 1 ? 3 : 6;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(parsed);
  return [formatted, ...unitParts].join(' ');
}

/** Round milestone targets read best compact: 5M, 500K. */
function formatMilestoneTarget(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Per-window comparison rows inside a window-scoped record card. */
function WindowBreakdown({
  rows,
  highlightWindow,
}: {
  rows: { window: string; formatted: string }[];
  highlightWindow: string;
}) {
  return (
    <dl className="divide-y divide-divider/60 border-t border-divider/60 text-xs">
      {rows.map((row) => {
        const isRecord = row.window === highlightWindow;
        return (
          <div
            key={row.window}
            className={`flex items-center justify-between py-1.5 ${
              isRecord ? 'text-titleText' : 'text-[#8a93a5]'
            }`}
          >
            <dt className="font-medium uppercase">{row.window}</dt>
            <dd className="tabular-nums">
              {row.formatted}
              {isRecord && (
                <span className="ml-2 rounded-sm bg-[#26282e] px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-lightBlue">
                  Record
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function MilestoneRow({
  milestone,
  color,
}: {
  milestone: RollupMilestone;
  color: string;
}) {
  const progress = Math.max(0, Math.min(100, milestone.progressPercent));
  return (
    <div
      id={`milestone-${milestone.key}`}
      className="scroll-mt-28 border-t border-divider/60 py-4 first:border-t-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2.5">
          <AttributionBadge user={milestone.name} sizeClass="h-6 w-6" px={24} />
          <span className="font-windsor-bold text-lg text-titleText">
            {milestone.name}
          </span>
        </div>
        <div className="text-sm text-[#a9adb6] tabular-nums">
          <span className="font-medium text-titleText">
            {formatNumber(milestone.blobCount)}
          </span>{' '}
          blobs, {formatNumber(milestone.remainingToMilestone)} to{' '}
          {formatMilestoneTarget(milestone.nextMilestone)}
        </div>
      </div>
      <div
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#22252c]"
        role="progressbar"
        aria-label={`${milestone.name} progress to ${formatMilestoneTarget(milestone.nextMilestone)} blobs`}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-[#6e7687]">
        <span>{formatPercent(progress)} there</span>
        <span>{formatMilestoneTarget(milestone.nextMilestone)} blobs</span>
      </div>
    </div>
  );
}

function RecordsGrid({ records }: { records: BlobRecords }) {
  const { streak, peakWindowFee, busiestWindow, biggestSpender, allTime, milestones } =
    records;

  const milestoneColors = useMemo(
    () =>
      assignSeriesColors(
        milestones.map((milestone) => ({
          key: milestone.key,
          category: milestone.category,
        }))
      ),
    [milestones]
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {streak && (
          <RecordCard
            id="full-block-streak"
            title="Full-Block Streak"
            scope="live"
            scopeLabel="Live"
            accent="green"
            value={formatNumber(streak.consecutiveFullBlocks)}
            unit={streak.consecutiveFullBlocks === 1 ? 'block' : 'blocks'}
            caption={
              <>
                Consecutive blocks that used every available blob slot.{' '}
                {formatPercent(streak.percentRecentBlocksAtMaxBlobs)} of recent blocks
                hit the max blob count.
              </>
            }
          />
        )}

        {streak && (
          <RecordCard
            id="blocks-above-target"
            title="Blocks Above Target"
            scope="live"
            scopeLabel="Live"
            accent="blue"
            value={formatNumber(streak.recentBlocksAboveTarget)}
            unit={streak.recentBlocksAboveTarget === 1 ? 'block' : 'blocks'}
            caption="Recent blocks burning blob gas above the protocol target. Sustained pressure here pushes the blob base fee upward."
          />
        )}

        {peakWindowFee && (
          <RecordCard
            id="peak-p95-fee"
            title="Highest p95 Base Fee"
            scope="window"
            scopeLabel={`${peakWindowFee.window} window`}
            accent="red"
            value={formatGweiValue(peakWindowFee.p95Gwei)}
            unit="Gwei"
            caption="Highest p95 blob base fee across the rolling stats windows. Window-scoped: windows reach back at most 30 days, so this is not an all-time high."
          >
            <WindowBreakdown
              highlightWindow={peakWindowFee.window}
              rows={peakWindowFee.perWindow.map((entry) => ({
                window: entry.window,
                formatted: `${formatGweiValue(entry.p95Gwei)} Gwei`,
              }))}
            />
          </RecordCard>
        )}

        {busiestWindow && (
          <RecordCard
            id="busiest-window"
            title="Busiest Window"
            scope="window"
            scopeLabel={`${busiestWindow.window} window`}
            accent="yellow"
            value={formatNumber(Math.round(busiestWindow.blobsPerHour))}
            unit="blobs / hour"
            caption={
              <>
                Fastest blob throughput among the rolling windows, led by the{' '}
                {busiestWindow.window} window with{' '}
                {formatNumber(busiestWindow.totalBlobs)} blobs. Rates are compared
                because longer windows always contain more blobs outright.
              </>
            }
          >
            <WindowBreakdown
              highlightWindow={busiestWindow.window}
              rows={busiestWindow.perWindow.map((entry) => ({
                window: entry.window,
                formatted: `${formatNumber(Math.round(entry.blobsPerHour))}/hr`,
              }))}
            />
          </RecordCard>
        )}

        {biggestSpender && (
          <RecordCard
            id="biggest-spender"
            title="Biggest Spender"
            scope="all-time"
            scopeLabel="All indexed"
            accent="purple"
            value={formatWeiToEth(biggestSpender.totalCostWei, true)}
            caption={
              <span className="flex items-center gap-2">
                <AttributionBadge
                  user={biggestSpender.name}
                  sizeClass="h-5 w-5"
                  px={20}
                />
                <span>
                  <span className="font-medium text-titleText">
                    {biggestSpender.name}
                  </span>{' '}
                  leads all attributed entities with{' '}
                  {formatPercent(biggestSpender.spendSharePercent)} of blob spend
                  across {formatNumber(biggestSpender.blobCount)} blobs.
                </span>
              </span>
            }
          />
        )}

        {allTime && (
          <RecordCard
            id="total-blobs"
            title="Total Blobs Indexed"
            scope="all-time"
            scopeLabel="All indexed"
            accent="blue"
            value={formatNumber(allTime.totalBlobs)}
            unit="blobs"
            caption={
              <>
                Every blob this indexer has seen, at an average base fee of{' '}
                {compactFeeLabel(allTime.averageBaseFee)}.
              </>
            }
          />
        )}
      </div>

      {milestones.length > 0 && (
        <section
          id="rollup-milestones"
          className="mt-4 scroll-mt-28 overflow-hidden rounded-lg border border-divider bg-gradient-to-b from-[#1a1c22] to-[#141519] p-5 sm:p-6"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-windsor-bold text-2xl text-titleText">
              Milestone Watch
            </h2>
            <span className="inline-flex items-center rounded-full border border-[#b3a6f5]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#b3a6f5]">
              All indexed
            </span>
          </div>
          <p className="mb-4 text-sm text-[#a9adb6]">
            Each rollup&apos;s march toward its next round blob-count milestone,
            counted over all indexed history.
          </p>
          {milestones.map((milestone) => (
            <MilestoneRow
              key={milestone.key}
              milestone={milestone}
              color={milestoneColors[milestone.key] ?? '#3b55e6'}
            />
          ))}
        </section>
      )}
    </>
  );
}

export default function RecordsPage() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const fetchRecords = useCallback(() => api.getBlobRecords(network), [network]);
  const {
    data: records,
    isLoading,
    error,
  } = useApiData<BlobRecords>(fetchRecords, ['blob-records', network], {
    refetchInterval: RECORDS_REFRESH_MS,
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <h1 className="mb-2 font-windsor-bold text-3xl text-white sm:text-4xl">
        Blob Market Records
      </h1>
      <p className="mb-4 max-w-3xl text-sm text-bodyText">
        Streaks, peaks, and milestones from the {selectedNetwork.name} blob market,
        refreshed every {RECORDS_REFRESH_MS / 1000} seconds.
      </p>
      <div className="mb-8 flex max-w-3xl items-start gap-2.5 rounded-md border border-[#292e35] bg-[#17181b] px-3.5 py-3 text-sm text-[#a9adb6]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
        <p>
          Records are derived from the indexer&apos;s live and rolling-window data.
          Cards marked with a window scope cover at most the last 30 days; true
          all-time-high tracking needs backend support and will slot in here when it
          ships.
        </p>
      </div>

      <DataStateWrapper
        isLoading={isLoading && !records}
        error={records ? null : error}
        loadingComponent={
          <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-44 rounded-lg border border-divider bg-[#17191d]"
              />
            ))}
          </div>
        }
      >
        {records && <RecordsGrid records={records} />}
      </DataStateWrapper>
    </div>
  );
}
