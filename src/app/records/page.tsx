"use client";

import { ArrowLeft, Info } from 'lucide-react';
import Link from '@/components/NetworkLink';
import React, { useCallback, useMemo } from 'react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import RecordCard, { type RecordAccent } from '@/components/RecordCard';
import TapTooltip from '@/components/TapTooltip';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import type { BlobRecords, RollupMilestone, StreakLeaderboard } from '@/types';
import {
  assignSeriesColors,
  formatBlobCount,
  formatDate,
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

const HOUR_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

function formatUtcHour(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return `${HOUR_LABEL_FORMAT.format(parsed)} UTC`;
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatUtcDay(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return DAY_LABEL_FORMAT.format(parsed);
}

function formatRunDate(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? timestamp : formatDate(parsed);
}

function BlockLink({ blockNumber }: { blockNumber: number }) {
  return (
    <Link
      href={`/block/${blockNumber}`}
      className="text-blue hover:underline"
    >
      #{formatNumber(blockNumber)}
    </Link>
  );
}

/** Ranked top-N rows inside a record card; row one is the record holder. */
function RankedRows({
  rows,
}: {
  rows: { key: string; primary: React.ReactNode; secondary: React.ReactNode }[];
}) {
  return (
    <ol className="divide-y divide-divider/60 border-t border-divider/60 text-xs">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className={`flex items-center justify-between gap-3 py-1.5 ${
            index === 0 ? 'text-titleText' : 'text-[#8a93a5]'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 tabular-nums text-[#6e7687]">
              {index + 1}
            </span>
            <span className="flex min-w-0 items-center gap-2 font-medium">
              {row.primary}
            </span>
            {index === 0 && (
              <span className="shrink-0 rounded-sm bg-[#26282e] px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-lightBlue">
                Record
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2 tabular-nums">
            {row.secondary}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * One historical streak leaderboard card. Renders nothing when the board has
 * no runs yet (a young network).
 */
function StreakCard({
  id,
  title,
  accent,
  kind,
  board,
}: {
  id: string;
  title: string;
  accent: RecordAccent;
  /** Plural noun phrase completing "run of consecutive {kind}". */
  kind: string;
  board: StreakLeaderboard;
}) {
  if (board.top.length === 0) return null;
  const record = board.top[0];

  return (
    <RecordCard
      id={id}
      title={title}
      accent={accent}
      value={formatNumber(record.length)}
      unit={record.length === 1 ? 'block' : 'blocks'}
      caption={
        <>
          {`Longest run of consecutive ${kind} ever indexed, ended at `}
          <BlockLink blockNumber={record.endBlock} />
          {` on ${formatRunDate(record.endTimestamp)}. Current streak: ${formatNumber(board.current?.length ?? 0)}.`}
        </>
      }
    >
      <RankedRows
        rows={board.top.map((run, index) => ({
          key: `${run.endBlock}-${index}`,
          primary: <span>{formatNumber(run.length)} blocks</span>,
          secondary: (
            <>
              <BlockLink blockNumber={run.endBlock} />
              <span>{formatRunDate(run.endTimestamp)}</span>
            </>
          ),
        }))}
      />
    </RecordCard>
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
          </span>
          {` blobs, ${formatNumber(milestone.remainingToMilestone)} to ${formatMilestoneTarget(milestone.nextMilestone)}`}
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
  const {
    fullBlockStreaks,
    aboveTargetStreaks,
    belowTargetStreaks,
    feePeaks,
    expensiveBlocks,
    busiestHours,
    busiestDays,
    priciestDays,
    utilizationDays,
    topSpenders,
    allTime,
    milestones,
  } = records;

  const topFeePeak = feePeaks.length > 0 ? feePeaks[0] : null;
  const topExpensive = expensiveBlocks.length > 0 ? expensiveBlocks[0] : null;
  const topHour = busiestHours.length > 0 ? busiestHours[0] : null;
  const topDay = busiestDays.length > 0 ? busiestDays[0] : null;
  const topPriciestDay = priciestDays.length > 0 ? priciestDays[0] : null;
  const topUtilization = utilizationDays.length > 0 ? utilizationDays[0] : null;
  const topSpender = topSpenders.length > 0 ? topSpenders[0] : null;

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
        <StreakCard
          id="full-block-streak"
          title="Full-Block Streak"
          accent="green"
          kind="full blocks"
          board={fullBlockStreaks}
        />

        <StreakCard
          id="blocks-above-target"
          title="Above-Target Streak"
          accent="blue"
          kind="blocks above the blob gas target"
          board={aboveTargetStreaks}
        />

        <StreakCard
          id="below-target-streak"
          title="Below-Target Streak"
          accent="purple"
          kind="blocks below the blob gas target"
          board={belowTargetStreaks}
        />

        {topFeePeak && (
          <RecordCard
            id="highest-base-fee"
            title="Highest Base Fee"
            accent="red"
            value={formatGweiValue(topFeePeak.feeGwei)}
            unit="Gwei"
            caption={
              <>
                {'Highest blob base fee ever quoted, at '}
                <BlockLink blockNumber={topFeePeak.blockNumber} />
                {` on ${formatRunDate(topFeePeak.timestamp)}. The protocol prices blobspace in every block, so peak blocks often carry zero blobs: at the top of a spike everyone is priced out.`}
              </>
            }
          >
            <RankedRows
              rows={feePeaks.map((peak) => ({
                key: `${peak.blockNumber}`,
                primary: <span>{formatGweiValue(peak.feeGwei)} Gwei</span>,
                secondary: (
                  <>
                    <span>{formatBlobCount(peak.blobCount)}</span>
                    <BlockLink blockNumber={peak.blockNumber} />
                    <span>{formatRunDate(peak.timestamp)}</span>
                  </>
                ),
              }))}
            />
          </RecordCard>
        )}

        {topExpensive && (
          <RecordCard
            id="most-expensive-block"
            title="Most Expensive Block"
            accent="yellow"
            value={formatWeiToEth(topExpensive.totalCostWei, true)}
            caption={
              <>
                {'The most spent on blobs in a single block: '}
                <BlockLink blockNumber={topExpensive.blockNumber} />
                {` on ${formatRunDate(topExpensive.timestamp)}, carrying ${formatNumber(topExpensive.blobCount)} blobs.`}
              </>
            }
          >
            <RankedRows
              rows={expensiveBlocks.map((block) => ({
                key: `${block.blockNumber}`,
                primary: <span>{formatWeiToEth(block.totalCostWei, true)}</span>,
                secondary: (
                  <>
                    <BlockLink blockNumber={block.blockNumber} />
                    <span>{formatRunDate(block.timestamp)}</span>
                  </>
                ),
              }))}
            />
          </RecordCard>
        )}

        {topPriciestDay && (
          <RecordCard
            id="priciest-day"
            title="Priciest Day"
            accent="purple"
            value={formatWeiToEth(topPriciestDay.totalCostWei, true)}
            caption={`The most burned on blobs in a single UTC day: ${formatUtcDay(topPriciestDay.dayStart)}, across ${formatNumber(topPriciestDay.blobCount)} blobs.`}
          >
            <RankedRows
              rows={priciestDays.map((day) => ({
                key: day.dayStart,
                primary: <span>{formatWeiToEth(day.totalCostWei, true)}</span>,
                secondary: (
                  <>
                    <span>{formatBlobCount(day.blobCount)}</span>
                    <span>{formatUtcDay(day.dayStart)}</span>
                  </>
                ),
              }))}
            />
          </RecordCard>
        )}

        {topHour && (
          <RecordCard
            id="busiest-hour"
            title="Busiest Hour"
            accent="yellow"
            value={formatNumber(topHour.blobCount)}
            unit="blobs in one hour"
            caption={`The most blobs ever landed in a single UTC hour, on ${formatUtcHour(topHour.hourStart)}.`}
          >
            <RankedRows
              rows={busiestHours.map((hour) => ({
                key: hour.hourStart,
                primary: <span>{formatNumber(hour.blobCount)} blobs</span>,
                secondary: <span>{formatUtcHour(hour.hourStart)}</span>,
              }))}
            />
          </RecordCard>
        )}

        {topDay && (
          <RecordCard
            id="busiest-day"
            title="Busiest Day"
            accent="green"
            value={formatNumber(topDay.blobCount)}
            unit="blobs in one day"
            caption={`The most blobs ever landed in a single UTC day, on ${formatUtcDay(topDay.dayStart)}.`}
          >
            <RankedRows
              rows={busiestDays.map((day) => ({
                key: day.dayStart,
                primary: <span>{formatNumber(day.blobCount)} blobs</span>,
                secondary: <span>{formatUtcDay(day.dayStart)}</span>,
              }))}
            />
          </RecordCard>
        )}

        {topUtilization && (
          <RecordCard
            id="highest-utilization-day"
            title="Highest Utilization Day"
            accent="blue"
            value={formatPercent(topUtilization.averageUtilizationPercent)}
            unit="avg utilization"
            caption={`The most saturated day of blobspace on record: ${formatUtcDay(topUtilization.dayStart)}, averaged across ${formatNumber(topUtilization.blockCount)} blocks.`}
          >
            <RankedRows
              rows={utilizationDays.map((day) => ({
                key: day.dayStart,
                primary: (
                  <span>{formatPercent(day.averageUtilizationPercent)}</span>
                ),
                secondary: <span>{formatUtcDay(day.dayStart)}</span>,
              }))}
            />
          </RecordCard>
        )}

        {topSpender && (
          <RecordCard
            id="top-spenders"
            title="Top Spenders"
            accent="purple"
            value={formatWeiToEth(topSpender.totalCostWei, true)}
            caption={
              <span className="flex items-center gap-2">
                <AttributionBadge
                  user={topSpender.name}
                  sizeClass="h-5 w-5"
                  px={20}
                />
                <span>
                  <span className="font-medium text-titleText">
                    {topSpender.name}
                  </span>
                  {` leads all attributed entities with ${formatPercent(topSpender.spendSharePercent)} of blob spend across ${formatNumber(topSpender.blobCount)} blobs.`}
                </span>
              </span>
            }
          >
            <RankedRows
              rows={topSpenders.map((spender) => ({
                key: spender.key,
                primary: (
                  <>
                    <AttributionBadge
                      user={spender.name}
                      sizeClass="h-4 w-4"
                      px={16}
                    />
                    <span className="truncate">{spender.name}</span>
                  </>
                ),
                secondary: (
                  <>
                    <span>{formatWeiToEth(spender.totalCostWei, true)}</span>
                    <span className="text-[#6e7687]">
                      {formatPercent(spender.spendSharePercent)}
                    </span>
                  </>
                ),
              }))}
            />
          </RecordCard>
        )}

        {allTime && (
          <RecordCard
            id="total-blobs"
            title="Total Blobs Indexed"
            accent="blue"
            value={formatNumber(allTime.totalBlobs)}
            unit="blobs"
            caption={`Every blob this indexer has seen, at an average base fee of ${compactFeeLabel(allTime.averageBaseFee)}.`}
          />
        )}
      </div>

      {milestones.length > 0 && (
        <section
          id="rollup-milestones"
          className="mt-4 scroll-mt-28 overflow-hidden rounded-lg border border-divider bg-gradient-to-b from-[#1a1c22] to-[#141519] p-5 sm:p-6"
        >
          <h2 className="mb-2 font-windsor-bold text-2xl text-titleText">
            Milestone Watch
          </h2>
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

      <div className="mb-2 flex items-center gap-2">
        <h1 className="font-windsor-bold text-3xl text-white sm:text-4xl">
          Blob Market Records
        </h1>
        {/* The only place the page states what the spend ranking leaves out,
            so it uses TapTooltip: a hover-only tooltip would keep the caveat
            from touch users entirely. */}
        <TapTooltip
          side="bottom"
          align="start"
          contentClassName="w-80 max-w-[calc(100vw-2rem)] px-3 py-2.5"
          content={
            <p className="text-[11px] leading-relaxed text-[#a9adb6]">
              Leaderboards cover the indexer&apos;s full indexed history. The
              spend ranking and milestones count attributed entities only, so
              unattributed senders are not represented there.
            </p>
          }
        >
          <button
            type="button"
            aria-label="About these leaderboards"
            className="text-[#8a93a5] transition-colors hover:text-blue focus:outline-none focus-visible:text-blue"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </TapTooltip>
      </div>
      <p className="mb-8 max-w-3xl text-sm text-bodyText">
        All-time streaks, peaks, and milestones from the {selectedNetwork.name}{' '}
        blob market, refreshed every {RECORDS_REFRESH_MS / 1000} seconds.
      </p>

      <DataStateWrapper
        isLoading={isLoading && !records}
        error={records ? null : error}
        loadingComponent={
          <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
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
