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
import type { BlobUsageDataPoint, BlobUsageSeries } from '../../types';
import {
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
} from '../../constants/chartTheme';
import { assignSeriesColors } from '@/utils';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { isolateLegendKey } from './legendIsolation';

/** 'count' plots blobs per bucket; 'share' plots each series' percentage of the bucket. */
export type BlobUsageVariant = 'count' | 'share';

interface BlobUsageChartProps {
  data: BlobUsageDataPoint[];
  series: BlobUsageSeries[];
  variant?: BlobUsageVariant;
}

function getNumericValue(point: BlobUsageDataPoint, key: string): number {
  const value = point[key];
  return typeof value === 'number' ? value : 0;
}

const SHARE_TICKS = [0, 25, 50, 75, 100];

function formatSharePct(value: number): string {
  if (value > 0 && value < 0.1) return '<0.1%';
  return `${value.toFixed(1)}%`;
}

/**
 * Restates each bucket as every series' percentage of that bucket's blob total,
 * so a rising band means a growing share of blobspace rather than a busier
 * chain. `total` stays the bucket's absolute blob count, both so the tooltip can
 * show volume alongside the share (a 100% share of two blobs is not a busy
 * bucket) and so it stays the denominator: blobs outside the plotted series
 * leave a visible gap below 100% rather than being renormalized away.
 */
export function toShareData(
  data: BlobUsageDataPoint[],
  series: BlobUsageSeries[]
): BlobUsageDataPoint[] {
  return data.map((point) => {
    const total = getNumericValue(point, 'total');
    const row: BlobUsageDataPoint = { ...point };

    for (const entry of series) {
      row[entry.key] = total > 0 ? (getNumericValue(point, entry.key) / total) * 100 : 0;
    }

    return row;
  });
}

export default function BlobUsageChart({ data, series, variant = 'count' }: BlobUsageChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const isolateKey = (key: string, allKeys: string[]) => {
    setHiddenKeys((prev) => isolateLegendKey(prev, allKeys, key));
  };

  const isShare = variant === 'share';
  const seriesColors = useMemo(() => assignSeriesColors(series), [series]);
  const plotData = useMemo(
    () => (isShare ? toShareData(data, series) : data),
    [data, series, isShare]
  );

  const legendEntries = useMemo(
    () => series
      .map((entry) => ({
        ...entry,
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

  if (series.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        Attribution data unavailable
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
              const bucketTotal = getNumericValue(
                payload[0].payload as BlobUsageDataPoint,
                'total'
              );
              return (
                <ChartTooltipFrame label={label}>
                  {payload
                    .filter((entry) => typeof entry.value === 'number' && entry.value > 0)
                    .map((entry) => (
                      <ChartTooltipRow
                        key={entry.dataKey?.toString()}
                        swatchColor={entry.color}
                        label={String(entry.name ?? '')}
                        value={
                          isShare && typeof entry.value === 'number'
                            ? formatSharePct(entry.value)
                            : entry.value
                        }
                      />
                    ))}
                  {isShare && (
                    <ChartTooltipRow
                      label="Total"
                      value={`${bucketTotal} ${bucketTotal === 1 ? 'blob' : 'blobs'}`}
                    />
                  )}
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
              onClick={() => isolateKey(entry.key, legendEntries.map((d) => d.key))}
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
