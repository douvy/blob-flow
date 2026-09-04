"use client";

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BlobTipDataPoint, BlobUsageSeries } from '../../types';
import { AXIS_STROKE, AXIS_LINE, AXIS_TICK } from '../../constants/chartTheme';
import { assignSeriesColors, formatGwei } from '@/utils';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { isolateLegendKey } from './legendIsolation';
import { formatGweiTick } from './tipFormat';

interface BlobTipsChartProps {
  data: BlobTipDataPoint[];
  series: BlobUsageSeries[];
}

/**
 * One row per bucket with each series' average tip, or null where the
 * series posted nothing: a zero would read as a zero bid, when the sender
 * simply had no blobs in the bucket, so the line breaks instead.
 */
interface TipPlotRow {
  label: string;
  point: BlobTipDataPoint;
  values: Record<string, number | null>;
}

export function toTipPlotRows(data: BlobTipDataPoint[], series: BlobUsageSeries[]): TipPlotRow[] {
  return data.map((point) => {
    const values: Record<string, number | null> = {};
    for (const entry of series) {
      const value = point.values[entry.key];
      values[entry.key] = value && value.blobCount > 0 ? value.averageGwei : null;
    }
    return { label: point.label, point, values };
  });
}

export default function BlobTipsChart({ data, series }: BlobTipsChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const isolateKey = (key: string, allKeys: string[]) => {
    setHiddenKeys((prev) => isolateLegendKey(prev, allKeys, key));
  };

  const seriesColors = useMemo(() => assignSeriesColors(series), [series]);
  const plotData = useMemo(() => toTipPlotRows(data, series), [data, series]);

  const legendEntries = useMemo(
    () => series
      .map((entry) => ({
        ...entry,
        color: seriesColors[entry.key],
        blobCount: data.reduce((sum, point) => sum + (point.values[entry.key]?.blobCount ?? 0), 0),
      }))
      .filter((entry) => entry.blobCount > 0),
    [data, series, seriesColors]
  );

  // A data refresh can drop the isolated series out of the legend, leaving
  // every remaining key hidden; treat that as no filter so the chart never
  // renders empty.
  const allCurrentHidden =
    legendEntries.length > 0 && legendEntries.every((entry) => hiddenKeys.has(entry.key));
  const effectiveHiddenKeys = allCurrentHidden ? new Set<string>() : hiddenKeys;

  if (legendEntries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        Tip data unavailable
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={plotData} margin={{ top: 5, right: 10, left: 0, bottom: 32 }}>
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
            width={45}
            tickFormatter={formatGweiTick}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = (payload[0].payload as TipPlotRow).point;
              const rows = payload
                .filter((entry) => typeof entry.value === 'number')
                .sort((a, b) => Number(b.value) - Number(a.value));
              return (
                <ChartTooltipFrame label={label}>
                  {rows.map((entry) => {
                    const key = String(entry.dataKey ?? '').replace(/^values\./, '');
                    const blobCount = point.values[key]?.blobCount ?? 0;
                    return (
                      <ChartTooltipRow
                        key={key}
                        swatchColor={entry.color}
                        label={String(entry.name ?? '')}
                        value={`${formatGwei(Number(entry.value), 4)} avg over ${blobCount} ${blobCount === 1 ? 'blob' : 'blobs'}`}
                      />
                    );
                  })}
                  <ChartTooltipRow
                    label="Bucket"
                    value={`median ${formatGwei(point.medianGwei, 4)}, max ${formatGwei(point.maxGwei, 4)}`}
                  />
                </ChartTooltipFrame>
              );
            }}
          />
          {legendEntries.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={`values.${entry.key}`}
              stroke={entry.color}
              strokeWidth={2}
              name={entry.name}
              hide={effectiveHiddenKeys.has(entry.key)}
              // An isolated bucket draws no line segment; a dot keeps sparse
              // bids (one tx in a range) visible.
              dot={plotData.length === 1 ? { r: 3, fill: entry.color } : false}
              activeDot={{ r: 4, fill: entry.color }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
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
