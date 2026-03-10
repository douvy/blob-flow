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
import type { L2UsageDataPoint } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_LABEL_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  L2_COLORS,
} from '../../constants/chartTheme';

interface L2UsageChartProps {
  data: L2UsageDataPoint[];
}

const L2_KEYS = ['arbitrum', 'optimism', 'base', 'zksync', 'unknown'] as const;

const L2_LABELS: Record<string, string> = {
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  zksync: 'zkSync',
  unknown: 'Unknown',
};

export default function L2UsageChart({ data }: L2UsageChartProps) {
  // Use pie chart when too few data points for meaningful time-series
  const usePie = data.length <= 3;

  const pieData = useMemo(() => {
    if (!usePie) return [];
    const totals: Record<string, number> = {};
    for (const key of L2_KEYS) {
      totals[key] = data.reduce((sum, d) => sum + d[key], 0);
    }
    return L2_KEYS
      .filter(key => totals[key] > 0)
      .map(key => ({
        name: L2_LABELS[key],
        value: totals[key],
        color: L2_COLORS[key],
      }));
  }, [data, usePie]);

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
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
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
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
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
          labelStyle={CHART_LABEL_STYLE}
        />
        {L2_KEYS.map(key => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={L2_COLORS[key]}
            fill={L2_COLORS[key]}
            fillOpacity={0.6}
            name={L2_LABELS[key]}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
