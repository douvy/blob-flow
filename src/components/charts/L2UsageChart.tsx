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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { L2UsageDataPoint, L2UsageSeries } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_ITEM_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
} from '../../constants/chartTheme';
import { assignSeriesColors } from '@/utils';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { isolateLegendKey } from './legendIsolation';

interface L2UsageChartProps {
  data: L2UsageDataPoint[];
  series: L2UsageSeries[];
}

function getNumericValue(point: L2UsageDataPoint, key: string): number {
  const value = point[key];
  return typeof value === 'number' ? value : 0;
}

export default function L2UsageChart({ data, series }: L2UsageChartProps) {
  const usePie = data.length <= 3;
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const isolateKey = (key: string, allKeys: string[]) => {
    setHiddenKeys((prev) => isolateLegendKey(prev, allKeys, key));
  };

  const seriesColors = useMemo(() => assignSeriesColors(series), [series]);

  const pieData = useMemo(() => {
    if (!usePie) return [];
    return series
      .map((entry) => ({
        key: entry.key,
        name: entry.name,
        value: data.reduce((sum, point) => sum + getNumericValue(point, entry.key), 0),
        color: seriesColors[entry.key],
      }))
      .filter((entry) => entry.value > 0);
  }, [data, series, seriesColors, usePie]);

  const legendEntries = useMemo(
    () => series
      .map((entry) => ({
        ...entry,
        color: seriesColors[entry.key],
        total: data.reduce((sum, point) => sum + getNumericValue(point, entry.key), 0),
      }))
      .filter((entry) => entry.total > 0),
    [data, series, seriesColors]
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

  if (usePie && pieData.length > 0) {
    const visiblePieData = pieData.filter((entry) => !effectiveHiddenKeys.has(entry.key));
    const total = visiblePieData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center justify-center w-[50%] h-full">
          {visiblePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visiblePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                >
                  {visiblePieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  itemStyle={CHART_ITEM_STYLE}
                  formatter={(value, name) => {
                    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                    const pct = total > 0 ? Math.round((numericValue / total) * 100) : 0;
                    return [`${numericValue} (${pct}%)`, String(name ?? '')];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <span className="text-xs text-[#6e7687] text-center px-2">No series selected</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 ml-2">
          {pieData.map((entry) => {
            const hidden = effectiveHiddenKeys.has(entry.key);
            const pct = total > 0 && !hidden ? Math.round((entry.value / total) * 100) : 0;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => isolateKey(entry.key, pieData.map((d) => d.key))}
                aria-pressed={!hidden}
                className={`flex items-center gap-1.5 text-xs cursor-pointer rounded px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${hidden ? 'opacity-40' : ''}`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={`text-[#b8bdc7] ${hidden ? 'line-through' : ''}`}>{entry.name}</span>
                <span className="text-white font-medium ml-1">{pct}%</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 32 }}>
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
            width={35}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <ChartTooltipFrame label={label}>
                  {payload
                    .filter((entry) => typeof entry.value === 'number' && entry.value > 0)
                    .map((entry) => (
                      <ChartTooltipRow
                        key={entry.dataKey?.toString()}
                        swatchColor={entry.color}
                        label={String(entry.name ?? '')}
                        value={entry.value}
                      />
                    ))}
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
