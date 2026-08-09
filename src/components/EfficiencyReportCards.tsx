"use client";

import React, { useCallback, useMemo } from 'react';
import AttributionBadge from './AttributionBadge';
import DataStateWrapper from './DataStateWrapper';
import { EFFICIENCY_SAMPLE_SIZE } from '@/constants';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import {
  EFFICIENCY_RUBRIC,
  GRADE_SCALE,
  computeEfficiencyReport,
  type EntityReportCard,
  type LetterGrade,
} from '@/lib/efficiency';
import type { BlobResponse } from '@/types';
import { formatPercent, formatWeiToGwei } from '@/utils';

function gradeColorClass(letter: LetterGrade): string {
  if (letter.startsWith('A')) return 'text-green';
  if (letter.startsWith('B')) return 'text-lightBlue';
  if (letter.startsWith('C')) return 'text-amber-300';
  if (letter.startsWith('D')) return 'text-orange-400';
  return 'text-red';
}

function barColorClass(fraction: number): string {
  if (fraction >= 0.8) return 'bg-green';
  if (fraction >= 0.4) return 'bg-amber-300';
  return 'bg-red';
}

const RATIO_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatTipRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return 'far above';
  return `${RATIO_FORMAT.format(ratio)}x median`;
}

/** Average tips can be fractional wei; formatWeiToGwei only takes decimals. */
function formatAvgTipGwei(avgTipWei: number): string {
  try {
    return formatWeiToGwei(avgTipWei.toFixed(2));
  } catch {
    return '-';
  }
}

function MetricRow({
  label,
  value,
  points,
  weight,
}: {
  label: string;
  value: string;
  points: number;
  weight: number;
}) {
  const fraction = weight > 0 ? points / weight : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-secondaryText">
          {label}
        </span>
        <span className="text-sm text-white tabular-nums">{value}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#26282e]">
          <div
            className={`h-full rounded-full ${barColorClass(fraction)}`}
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
        <span className="w-12 text-right text-xs text-secondaryText tabular-nums">
          {Math.round(points)}/{weight}
        </span>
      </div>
    </div>
  );
}

function ReportCard({ card }: { card: EntityReportCard }) {
  return (
    <div className="rounded-lg border border-divider bg-gradient-to-b from-[#17181b] to-[#141519] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AttributionBadge user={card.entity} sizeClass="h-9 w-9" px={36} />
          <div className="min-w-0">
            <div className="truncate text-lg font-windsor-bold leading-tight text-titleText">
              {card.entity}
            </div>
            <div className="text-xs text-secondaryText">
              {card.blobCount.toLocaleString()} blob{card.blobCount === 1 ? '' : 's'} in sample
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-windsor-bold text-6xl leading-none ${gradeColorClass(card.grade.letter)}`}
          >
            {card.grade.letter}
          </div>
          <div className="mt-1 text-xs text-secondaryText tabular-nums">
            {card.grade.score.toFixed(1)}/100
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <MetricRow
          label="Blob fill"
          value={formatPercent(card.avgFillPercent)}
          points={card.grade.fillPoints}
          weight={EFFICIENCY_RUBRIC.fill.weight}
        />
        <MetricRow
          label="Tip paid"
          value={`${formatAvgTipGwei(card.avgTipWei)} (${formatTipRatio(card.tipToMedianRatio)})`}
          points={card.grade.tipPoints}
          weight={EFFICIENCY_RUBRIC.tip.weight}
        />
        <MetricRow
          label="Fee cap headroom"
          value={
            card.avgHeadroomPercent === null
              ? 'no data'
              : formatPercent(card.avgHeadroomPercent)
          }
          points={card.grade.headroomPoints}
          weight={EFFICIENCY_RUBRIC.headroom.weight}
        />
      </div>
    </div>
  );
}

function RubricSection() {
  return (
    <section className="mt-10 rounded-lg border border-divider bg-[#17181b] p-5">
      <h2 className="text-xl font-windsor-bold text-titleText">
        How grades are computed
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-bodyText">
        <li>
          <span className="text-titleText">
            Blob fill ({EFFICIENCY_RUBRIC.fill.weight} pts):
          </span>{' '}
          average share of each 131,072-byte blob actually filled with data.
          Full marks at 100% fill; a half-empty blob earns half the points.
          The network commits a full blob either way, so empty blobspace is
          pure waste.
        </li>
        <li>
          <span className="text-titleText">
            Tip discipline ({EFFICIENCY_RUBRIC.tip.weight} pts):
          </span>{' '}
          average tip per blob gas compared to the median tip across this
          sample, which is what inclusion actually costs right now. At or
          below the median earns full marks; points fall linearly to zero at{' '}
          {EFFICIENCY_RUBRIC.tip.zeroRatio}x the median.
        </li>
        <li>
          <span className="text-titleText">
            Fee cap discipline ({EFFICIENCY_RUBRIC.headroom.weight} pts):
          </span>{' '}
          average fee cap headroom, the share of the declared max blob fee
          left unused by the actual base fee. Persistently high headroom
          means bidding a cap far above the going rate. At or below{' '}
          {EFFICIENCY_RUBRIC.headroom.fullPercent}% earns full marks; points
          fall linearly to zero at {EFFICIENCY_RUBRIC.headroom.zeroPercent}%.
          Rollups whose blobs carry no headroom data score the neutral
          midpoint ({EFFICIENCY_RUBRIC.headroom.weight / 2} pts).
        </li>
      </ul>
      <div className="mt-4 text-sm text-bodyText">
        <span className="text-titleText">Grade scale:</span>{' '}
        {GRADE_SCALE.map((band, index) => (
          <span key={band.letter} className="whitespace-nowrap">
            {index > 0 && <span className="text-secondaryText"> · </span>}
            {band.letter} {band.min > 0 ? `≥ ${band.min}` : `< ${GRADE_SCALE[index - 1].min}`}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function EfficiencyReportCards() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const fetchBlobs = useCallback(
    () => api.getRawBlobs(EFFICIENCY_SAMPLE_SIZE, network),
    [network]
  );
  const { data, isLoading, error } = useApiData<BlobResponse[]>(
    fetchBlobs,
    ['efficiency-blobs', network],
    { refetchInterval: 60_000 }
  );

  const report = useMemo(
    () => (data ? computeEfficiencyReport(data) : null),
    [data]
  );

  return (
    <DataStateWrapper
      isLoading={isLoading}
      error={error}
      loadingComponent={
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg border border-divider bg-[#14161a]"
            />
          ))}
        </div>
      }
    >
      {report && report.cards.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-secondaryText">
            Graded over the most recent{' '}
            {report.sampleSize.toLocaleString()} blobs on{' '}
            {selectedNetwork.name}. Sample median tip:{' '}
            {formatAvgTipGwei(report.medianTipWei)} per blob gas. Refreshes
            every minute.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {report.cards.map((card) => (
              <ReportCard key={card.entity} card={card} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-divider bg-[#17181b] p-8 text-center text-sm text-secondaryText">
          No recent blobs to grade on {selectedNetwork.name}.
        </div>
      )}
      <RubricSection />
    </DataStateWrapper>
  );
}
