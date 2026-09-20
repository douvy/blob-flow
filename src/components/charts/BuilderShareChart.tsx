"use client";

import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type {
  BackendBuilderShareChartResponse,
  BackendBuilderShareSeries,
} from '@/types';
import { AXIS_STROKE, AXIS_LINE, AXIS_TICK } from '@/constants/chartTheme';
import { assignSeriesColors, formatNumber } from '@/utils';
import { builderDisplayName } from '@/lib/builders';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { isolateLegendKey } from './legendIsolation';

/** Which of the two counts a bucket carries is plotted. */
export type BuilderShareMetric = 'blocks' | 'blobs';

/** 'count' plots the raw per-bucket count; 'share' plots percent of the bucket. */
export type BuilderShareVariant = 'count' | 'share';

export interface BuilderShareChartProps {
  data: BackendBuilderShareChartResponse;
  metric: BuilderShareMetric;
  variant: BuilderShareVariant;
}

/** One plotted bucket: an axis label, the bucket total, and a value per series. */
export interface BuilderSharePoint {
  label: string;
  total: number;
  [seriesKey: string]: string | number;
}

const DAY_SECONDS = 86_400;
const SHARE_TICKS = [0, 25, 50, 75, 100];

function formatTwoDigit(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Label a bucket in the viewer's local timezone, matching the other charts.
 * Day-wide buckets never need a time; sub-day buckets need the date as soon as
 * the plotted data spans more than one day, otherwise identical-looking labels
 * repeat across days.
 */
function formatBucketLabel(timestamp: string, bucketSeconds: number, spanMs: number): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return timestamp;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (bucketSeconds >= DAY_SECONDS) return `${month}/${day}`;

  const time = `${formatTwoDigit(date.getHours())}:${formatTwoDigit(date.getMinutes())}`;
  return spanMs > DAY_SECONDS * 1000 ? `${month}/${day} ${time}` : time;
}

function parseTime(timestamp: string): number {
  const time = new Date(timestamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

/**
 * Restate the backend's buckets as rows Recharts can stack.
 *
 * `total` stays the bucket's own count for the metric, both so the tooltip can
 * show volume alongside a share (100% of two blocks is not a busy bucket) and
 * so it stays the share denominator: anything outside the plotted series
 * leaves a visible gap below 100% rather than being renormalized away.
 */
export function toBuilderShareData(
  data: BackendBuilderShareChartResponse,
  metric: BuilderShareMetric,
  variant: BuilderShareVariant
): BuilderSharePoint[] {
  const points = data.points ?? [];
  const bucketSeconds = Number.isFinite(data.bucket_seconds) ? data.bucket_seconds : 0;
  const times = points.map((point) => parseTime(point.timestamp));
  const spanMs = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;

  return points.map((point) => {
    const total = metric === 'blocks' ? point.blocks : point.blobs;
    const row: BuilderSharePoint = {
      label: formatBucketLabel(point.timestamp, bucketSeconds, spanMs),
      total,
    };

    for (const series of data.series ?? []) {
      const value = point.values?.[series.key]?.[metric] ?? 0;
      row[series.key] = variant === 'share' ? (total > 0 ? (value / total) * 100 : 0) : value;
    }

    return row;
  });
}

function getNumericValue(point: BuilderSharePoint, key: string): number {
  const value = point[key];
  return typeof value === 'number' ? value : 0;
}

function formatSharePct(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1%';
  return `${value.toFixed(1)}%`;
}

function formatTotal(total: number, metric: BuilderShareMetric): string {
  const unit = metric === 'blocks' ? 'block' : 'blob';
  return `${formatNumber(total)} ${total === 1 ? unit : `${unit}s`}`;
}

/**
 * The grouped long tail takes the shared neutral rather than a hashed hue, so
 * it never reads as one more builder.
 */
function seriesColorInput(series: BackendBuilderShareSeries) {
  return { key: series.key, category: series.key === 'other' ? 'other' : undefined };
}

/**
 * Builder share over time: one stacked band per builder the backend broke out,
 * with the rest grouped under `other`.
 */
export default function BuilderShareChart({ data, metric, variant }: BuilderShareChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const isShare = variant === 'share';
  const series = useMemo(() => data.series ?? [], [data.series]);
  const seriesColors = useMemo(() => assignSeriesColors(series.map(seriesColorInput)), [series]);
  const plotData = useMemo(
    () => toBuilderShareData(data, metric, variant),
    [data, metric, variant]
  );

  const legendEntries = useMemo(
    () =>
      series
        .map((entry) => ({
          key: entry.key,
          name: builderDisplayName(entry),
          color: seriesColors[entry.key],
          total: plotData.reduce((sum, point) => sum + getNumericValue(point, entry.key), 0),
        }))
        .filter((entry) => entry.total > 0),
    [plotData, series, seriesColors]
  );

  // A data refresh can drop the isolated series out of the legend, leaving
  // every remaining key hidden; treat that as no filter so the chart never
  // renders empty.
  const allCurrentHidden =
    legendEntries.length > 0 && legendEntries.every((entry) => hiddenKeys.has(entry.key));
  const effectiveHiddenKeys = allCurrentHidden ? new Set<string>() : hiddenKeys;

  const isolateKey = (key: string, allKeys: string[]) => {
    setHiddenKeys((prev) => isolateLegendKey(prev, allKeys, key));
  };

  if (legendEntries.length === 0 || plotData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        No builder share data for this window.
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={plotData} margin={{ top: 5, right: 10, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
          <XAxis
            dataKey="label"
            stroke={AXIS_STROKE}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            stroke={AXIS_STROKE}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
            width={isShare ? 42 : 35}
            domain={isShare ? [0, 100] : undefined}
            ticks={isShare ? SHARE_TICKS : undefined}
            tickFormatter={isShare ? (value: number) => `${value}%` : undefined}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const bucketTotal = getNumericValue(payload[0].payload as BuilderSharePoint, 'total');
              return (
                <ChartTooltipFrame label={label}>
                  {payload
                    .filter(
                      (entry) =>
                        typeof entry.value === 'number' &&
                        entry.value > 0 &&
                        !effectiveHiddenKeys.has(String(entry.dataKey ?? ''))
                    )
                    .map((entry) => (
                      <ChartTooltipRow
                        key={entry.dataKey?.toString()}
                        swatchColor={entry.color}
                        label={String(entry.name ?? '')}
                        value={
                          isShare && typeof entry.value === 'number'
                            ? formatSharePct(entry.value)
                            : formatNumber(Number(entry.value ?? 0))
                        }
                      />
                    ))}
                  {/* Only blocks with a builder row are counted, so the
                      denominator is named as such rather than as the bucket. */}
                  <ChartTooltipRow
                    label="Attributed total"
                    value={formatTotal(bucketTotal, metric)}
                  />
                </ChartTooltipFrame>
              );
            }}
          />
          {legendEntries.map((entry) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              stackId="1"
              stroke={entry.color}
              fill={entry.color}
              fillOpacity={0.6}
              name={entry.name}
              hide={effectiveHiddenKeys.has(entry.key)}
              // A single bucket draws no area segment; show a dot so a sparse
              // range still renders a visible marker instead of empty axes.
              dot={plotData.length === 1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[#6e7687]">
        {legendEntries.map((entry) => {
          const hidden = effectiveHiddenKeys.has(entry.key);
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => isolateKey(entry.key, legendEntries.map((item) => item.key))}
              aria-pressed={!hidden}
              className={`inline-flex items-center cursor-pointer rounded px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${hidden ? 'opacity-40' : ''}`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1"
                style={{ backgroundColor: entry.color }}
              />
              <span className={hidden ? 'line-through' : ''}>{entry.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
