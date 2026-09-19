"use client";

import React, { Suspense } from 'react';
import type { BackendBuilderShareChartResponse } from '@/types';
import DataStateWrapper from './DataStateWrapper';
import BuilderShareChart, {
  type BuilderShareMetric,
  type BuilderShareVariant,
} from './charts/BuilderShareChart';
import { useApiData } from '@/hooks/useApiData';
import { useBuilderRangeParam } from '@/hooks/useBuilderRangeParam';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { BUILDER_RANGE_DESCRIPTIONS, builderDisplayName } from '@/lib/builders';
import { CHART_CARD_CLASS } from '@/constants/chartTheme';
import { Skeleton } from './ui/skeleton';

const REFRESH_INTERVAL_MS = 60_000;

/** How many of the summary's shares the caption names before it stops. */
const SUMMARY_SHARE_LIMIT = 4;

const METRIC_OPTIONS: ReadonlyArray<{ value: BuilderShareMetric; label: string }> = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'blobs', label: 'Blobs' },
];

const VARIANT_OPTIONS: ReadonlyArray<{ value: BuilderShareVariant; label: string }> = [
  { value: 'count', label: 'Count' },
  { value: 'share', label: 'Share' },
];

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      className="inline-flex items-center space-x-1 rounded-md bg-background/30 p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={`px-3 py-1 text-sm rounded-md transition-none ${option.value === value
            ? 'bg-[#1d1f23] text-white border border-divider border-b-[#282a2f] border-b-2'
            : 'text-white hover:text-white/90 border border-transparent'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BuilderShareSectionInner() {
  const { selectedNetwork } = useNetwork();
  const { range } = useBuilderRangeParam();

  const [metric, setMetric] = React.useState<BuilderShareMetric>('blocks');
  const [variant, setVariant] = React.useState<BuilderShareVariant>('count');

  const { data, isLoading, error } = useApiData<BackendBuilderShareChartResponse>(
    () => api.getBuilderShareChart(range, selectedNetwork.apiParam),
    ['chart-builder-share', selectedNetwork.apiParam, range],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );

  const loadingComponent = (
    <div className="h-72">
      <Skeleton className="h-full w-full" />
    </div>
  );

  const topShares = (data?.summary?.shares ?? []).slice(0, SUMMARY_SHARE_LIMIT);

  return (
    <div className={CHART_CARD_CLASS}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-md font-medium text-white">
          Builder share over {BUILDER_RANGE_DESCRIPTIONS[range]}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup label="Metric" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <ToggleGroup
            label="Scale"
            options={VARIANT_OPTIONS}
            value={variant}
            onChange={setVariant}
          />
        </div>
      </div>

      <DataStateWrapper
        isLoading={isLoading && !data}
        error={data ? null : error}
        loadingComponent={loadingComponent}
      >
        {data && (
          <>
            <div className="h-72 relative">
              <BuilderShareChart data={data} metric={metric} variant={variant} />
            </div>
            {topShares.length > 0 && (
              <p className="mt-3 text-xs text-[#6c727f]">
                {topShares
                  .map((share) => {
                    const percent =
                      metric === 'blocks' ? share.block_share_percent : share.blob_share_percent;
                    return `${builderDisplayName(share)} ${percent.toFixed(1)}%`;
                  })
                  .join(', ')}
              </p>
            )}
          </>
        )}
      </DataStateWrapper>
    </div>
  );
}

/**
 * Builder share over time for the window the ?range= param names, as either
 * raw counts or percent of each bucket, over blocks or blobs.
 *
 * The Suspense boundary is required: the inner component reads
 * useSearchParams through useBuilderRangeParam, which opts its subtree into
 * client rendering on the statically prerendered page.
 */
export default function BuilderShareSection() {
  return (
    <Suspense fallback={null}>
      <BuilderShareSectionInner />
    </Suspense>
  );
}
