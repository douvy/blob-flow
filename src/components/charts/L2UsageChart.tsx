"use client";

import React, { useMemo } from 'react';
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
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  L2_COLORS,
} from '../../constants/chartTheme';

interface L2UsageChartProps {
  data: L2UsageDataPoint[];
  series: L2UsageSeries[];
}

const FALLBACK_COLORS = [
  '#12aaff',
  '#1652f0',
  '#ff0420',
  '#66CC99',
  '#F0C040',
  '#8B8DFC',
  '#6e7687',
  '#f97316',
];

function getSeriesColor(key: string, index: number): string {
  return L2_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function getNumericValue(point: L2UsageDataPoint, key: string): number {
  const value = point[key];
  return typeof value === 'number' ? value : 0;
}

export default function L2UsageChart({ data, series }: L2UsageChartProps) {
  const usePie = data.length <= 3;

  const pieData = useMemo(() => {
    if (!usePie) return [];
    return series
      .map((entry, index) => ({
        name: entry.name,
        value: data.reduce((sum, point) => sum + getNumericValue(point, entry.key), 0),
        color: getSeriesColor(entry.key, index),
      }))
      .filter((entry) => entry.value > 0);
  }, [data, series, usePie]);

  const legendEntries = useMemo(
    () => series
      .map((entry, index) => ({
        ...entry,
        color: getSeriesColor(entry.key, index),
        total: data.reduce((sum, point) => sum + getNumericValue(point, entry.key), 0),
      }))
      .filter((entry) => entry.total > 0),
    [data, series]
  );

  if (series.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        Attribution data unavailable
      </div>
    );
  }

  if (usePie && pieData.length > 0) {
    const total = pieData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex items-center justify-center h-full">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={2}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 ml-2">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#b8bdc7]">{entry.name}</span>
              <span className="text-white font-medium ml-1">
                {Math.round((entry.value / total) * 100)}%
              </span>
            </div>
          ))}
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
            contentStyle={CHART_TOOLTIP_STYLE}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div style={CHART_TOOLTIP_STYLE}>
                  <p style={{ color: '#fff', fontSize: '12px', marginBottom: 4 }}>{label}</p>
                  {payload
                    .filter((entry) => typeof entry.value === 'number' && entry.value > 0)
                    .map((entry) => (
                      <p key={entry.dataKey?.toString()} style={{ color: entry.color, fontSize: '12px' }}>
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                </div>
              );
            }}
          />
          {series.map((entry, index) => (
            <Area
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              stackId="1"
              stroke={getSeriesColor(entry.key, index)}
              fill={getSeriesColor(entry.key, index)}
              fillOpacity={0.6}
              name={entry.name}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[#6e7687]">
        {legendEntries.slice(0, 6).map((entry) => (
          <span key={entry.key} className="inline-flex items-center">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm mr-1"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </>
  );
}
