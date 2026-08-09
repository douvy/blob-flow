"use client";

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown } from 'lucide-react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import NetworkLink from '@/components/NetworkLink';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import {
  VS_ENTITY_LIMIT,
  VS_RANGES,
  VS_RANGE_LABELS,
  VS_ROW_COUNT,
  buildVsComparison,
  buildVsHref,
  findShareBySlug,
  humanizeEntitySlug,
  isComparableShare,
  normalizeEntitySlug,
  slugForEntityKey,
} from '@/lib/vs';
import type {
  BackendAttributionUsageChartResponse,
  BackendAttributionUsageShare,
  BackendChartRange,
  VsComparisonRow,
  VsMetricFormat,
  VsWinner,
} from '@/types';
import {
  formatCostEthOrWei,
  formatNumber,
  formatPercent,
  formatWeiToEth,
  networkPath,
} from '@/utils';

interface VersusBattleCardProps {
  aSlug: string;
  bSlug: string;
  range: BackendChartRange;
}

function formatMetric(raw: string, format: VsMetricFormat): string {
  switch (format) {
    case 'count':
      return formatNumber(Number(raw));
    case 'percent':
      return formatPercent(Number(raw), 2);
    case 'eth':
      return formatWeiToEth(raw, true);
    case 'cost':
      return formatCostEthOrWei(raw);
  }
}

function formatRowValue(row: VsComparisonRow, side: 'a' | 'b'): string {
  return formatMetric(side === 'a' ? row.a : row.b, row.format);
}

/** The derived figure shown under a row's headline value, e.g. "24.62% share". */
function formatRowDetail(row: VsComparisonRow, side: 'a' | 'b'): string | null {
  if (!row.detail) return null;
  const raw = side === 'a' ? row.detail.a : row.detail.b;
  return `${formatMetric(raw, row.detail.format)} ${row.detail.label}`;
}

function RangeSwitcher({
  aSlug,
  bSlug,
  range,
}: {
  aSlug: string;
  bSlug: string;
  range: BackendChartRange;
}) {
  return (
    <nav aria-label="Time range" className="flex flex-wrap gap-2">
      {VS_RANGES.map((option) => {
        const isActive = option === range;
        return (
          <NetworkLink
            key={option}
            href={buildVsHref(aSlug, bSlug, option)}
            scroll={false}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${isActive
              ? 'border-blue bg-blue/20 text-white'
              : 'border-divider bg-[#1d1f23] text-bodyText hover:bg-[#252936] hover:text-white'
              }`}
            aria-current={isActive ? 'page' : undefined}
            title={VS_RANGE_LABELS[option]}
          >
            {option}
          </NetworkLink>
        );
      })}
    </nav>
  );
}

function EntityPicker({
  side,
  value,
  excludeKey,
  shares,
  onChange,
}: {
  side: 'a' | 'b';
  /** Backend share key of the current selection, or '' when unmatched. */
  value: string;
  /** Share key selected on the opposite side, hidden from this list. */
  excludeKey: string;
  shares: BackendAttributionUsageShare[];
  onChange: (slug: string) => void;
}) {
  const options = shares.filter((share) => share.key !== excludeKey);
  return (
    <select
      aria-label={side === 'a' ? 'Left contender' : 'Right contender'}
      value={value}
      onChange={(event) => onChange(slugForEntityKey(event.target.value))}
      className="w-full max-w-[220px] rounded-md border border-divider bg-[#1d1f23] px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue/60"
    >
      {value === '' && (
        <option value="" disabled>
          Pick a contender
        </option>
      )}
      {options.map((share) => (
        <option key={share.key} value={share.key}>
          {share.name}
        </option>
      ))}
    </select>
  );
}

function ContenderHeader({
  share,
  fallbackName,
  isOverallWinner,
}: {
  share: BackendAttributionUsageShare | undefined;
  fallbackName: string;
  isOverallWinner: boolean;
}) {
  const name = share?.name ?? fallbackName;
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <AttributionBadge
          user={name}
          sizeClass="h-16 w-16 sm:h-20 sm:w-20"
          textClass="text-2xl"
          px={80}
        />
        {isOverallWinner && (
          <span
            className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow"
            title="Matchup winner"
          >
            <Crown className="h-5 w-5 fill-current" aria-hidden="true" />
            <span className="sr-only">Matchup winner</span>
          </span>
        )}
      </div>
      <div>
        <div className="text-xl font-windsor-bold text-white sm:text-2xl">{name}</div>
        {share ? (
          <div className="text-xs uppercase tracking-wider text-secondaryText">
            {share.category}
          </div>
        ) : (
          <div className="text-xs text-red">No blob activity in this range</div>
        )}
      </div>
    </div>
  );
}

function winnerCellClass(rowWinner: VsWinner, side: 'a' | 'b'): string {
  if (rowWinner === side) {
    return 'bg-green/10 text-green font-medium';
  }
  if (rowWinner === 'tie') {
    return 'text-white';
  }
  return 'text-secondaryText';
}

function ComparisonRows({
  rows,
}: {
  rows: VsComparisonRow[];
}) {
  return (
    <div className="divide-y divide-divider border-t border-divider">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div
            className={`px-3 py-3 text-right text-sm tabular-nums sm:text-base ${winnerCellClass(row.winner, 'a')}`}
          >
            {formatRowValue(row, 'a')}
            {row.detail && (
              <div className="text-xs text-secondaryText">{formatRowDetail(row, 'a')}</div>
            )}
          </div>
          <div className="px-2 py-3 text-center sm:px-4">
            <div className="text-xs uppercase tracking-wider text-secondaryText">{row.label}</div>
            {row.betterDirection === 'lower' && (
              <div className="text-[10px] text-secondaryText/70">lower wins</div>
            )}
          </div>
          <div
            className={`px-3 py-3 text-left text-sm tabular-nums sm:text-base ${winnerCellClass(row.winner, 'b')}`}
          >
            {formatRowValue(row, 'b')}
            {row.detail && (
              <div className="text-xs text-secondaryText">{formatRowDetail(row, 'b')}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverallVerdict({
  overall,
  rowWins,
  aName,
  bName,
}: {
  overall: VsWinner;
  rowWins: { a: number; b: number };
  aName: string;
  bName: string;
}) {
  if (overall === 'tie') {
    return (
      <div className="border-t border-divider bg-[#1d1f23] px-4 py-3 text-center text-sm text-bodyText">
        Dead heat: {aName} and {bName} split the card evenly.
      </div>
    );
  }
  const winnerName = overall === 'a' ? aName : bName;
  const wins = overall === 'a' ? rowWins.a : rowWins.b;
  return (
    <div className="border-t border-green/40 bg-green/10 px-4 py-3 text-center text-sm text-green">
      <Crown className="mr-1.5 inline h-4 w-4 fill-current align-[-2px]" aria-hidden="true" />
      {winnerName} takes the matchup, winning {wins} of {VS_ROW_COUNT} stats.
    </div>
  );
}

export default function VersusBattleCard({ aSlug, bSlug, range }: VersusBattleCardProps) {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(range, network, 'auto', VS_ENTITY_LIMIT),
    [range, network]
  );

  // The limit is part of the key: the dashboard caches the same endpoint at
  // its default top-N breakout, which folds quieter rollups into "other".
  const { data, isLoading, error } = useApiData<BackendAttributionUsageChartResponse>(
    fetchAttribution,
    ['chart-attribution', network, range, VS_ENTITY_LIMIT]
  );

  const shares = useMemo(
    () =>
      (data?.summary.shares ?? [])
        .filter(isComparableShare)
        .sort((first, second) => second.blob_count - first.blob_count),
    [data]
  );

  const shareA = findShareBySlug(shares, aSlug);
  const shareB = findShareBySlug(shares, bSlug);
  const comparison = useMemo(
    () => (shareA && shareB ? buildVsComparison(shareA, shareB) : null),
    [shareA, shareB]
  );

  const aName = shareA?.name ?? humanizeEntitySlug(aSlug);
  const bName = shareB?.name ?? humanizeEntitySlug(bSlug);

  const swapSide = useCallback(
    (side: 'a' | 'b', slug: string) => {
      const nextA = side === 'a' ? slug : normalizeEntitySlug(aSlug);
      const nextB = side === 'b' ? slug : normalizeEntitySlug(bSlug);
      // Changing contender keeps the network the page is showing, the same
      // way the range switcher's links do.
      router.push(networkPath(buildVsHref(nextA, nextB, range), network), { scroll: false });
    },
    [router, aSlug, bSlug, range, network]
  );

  const loadingComponent = (
    <div className="rounded-lg border border-divider bg-[#14161a] p-6">
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-[#26282e]" />
          <div className="mx-auto h-20 w-20 rounded-full bg-[#26282e]" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-8 rounded bg-[#26282e]" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-[900px] px-4 py-8">
      <NetworkLink
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </NetworkLink>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-windsor-bold text-white">
            {aName} vs {bName}
          </h1>
          <p className="mt-1 text-sm text-secondaryText">
            Blobspace head-to-head, {VS_RANGE_LABELS[range].toLowerCase()} on {selectedNetwork.name}.
          </p>
        </div>
        <RangeSwitcher aSlug={normalizeEntitySlug(aSlug)} bSlug={normalizeEntitySlug(bSlug)} range={range} />
      </div>

      <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
        <div className="overflow-hidden rounded-lg border border-divider bg-[#14161a]">
          <div className="relative grid grid-cols-2 gap-4 px-4 pb-6 pt-8">
            <ContenderHeader
              share={shareA}
              fallbackName={aName}
              isOverallWinner={comparison?.overall === 'a'}
            />
            <ContenderHeader
              share={shareB}
              fallbackName={bName}
              isOverallWinner={comparison?.overall === 'b'}
            />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-divider bg-[#1d1f23] px-3 py-1 text-sm font-windsor-bold text-secondaryText"
            >
              VS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-divider bg-[#101216] px-4 py-3">
            <div className="flex justify-center">
              <EntityPicker
                side="a"
                value={shareA?.key ?? ''}
                excludeKey={shareB?.key ?? ''}
                shares={shares}
                onChange={(slug) => swapSide('a', slug)}
              />
            </div>
            <div className="flex justify-center">
              <EntityPicker
                side="b"
                value={shareB?.key ?? ''}
                excludeKey={shareA?.key ?? ''}
                shares={shares}
                onChange={(slug) => swapSide('b', slug)}
              />
            </div>
          </div>

          {comparison ? (
            <>
              <ComparisonRows rows={comparison.rows} />
              <OverallVerdict
                overall={comparison.overall}
                rowWins={comparison.rowWins}
                aName={aName}
                bName={bName}
              />
            </>
          ) : (
            <div className="border-t border-divider px-4 py-8 text-center">
              <div className="text-lg text-white">This matchup needs two contenders with data.</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-secondaryText">
                {shareA || shareB
                  ? `${shareA ? bName : aName} posted no blobs in this window. Pick another rollup above or widen the time range.`
                  : 'Neither side posted blobs in this window. Pick two rollups above or widen the time range.'}
              </p>
            </div>
          )}
        </div>
      </DataStateWrapper>
    </div>
  );
}
