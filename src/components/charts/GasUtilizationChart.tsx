"use client";

import React from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GasUtilizationDataPoint } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_LABEL_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  COLORS,
} from '../../constants/chartTheme';

interface GasUtilizationChartProps {
  data: GasUtilizationDataPoint[];
}

function formatGas(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export default function GasUtilizationChart({ data }: GasUtilizationChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
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
          tickFormatter={formatGas}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_LABEL_STYLE}
          formatter={(value: number, name: string) => {
            if (name === 'blobGasUsed') return [formatGas(value), 'Gas Used'];
            return [value, name];
          }}
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const d = payload[0].payload as GasUtilizationDataPoint;
            return (
              <div style={CHART_TOOLTIP_STYLE}>
                <p style={{ color: '#fff', fontSize: '12px', marginBottom: 4 }}>{label}</p>
                <p style={{ color: d.blobGasUsed > d.targetGas ? COLORS.red : COLORS.green, fontSize: '12px' }}>
                  Gas: {formatGas(d.blobGasUsed)}
                </p>
                <p style={{ color: '#6e7687', fontSize: '12px' }}>
                  Target: {formatGas(d.targetGas)}
                </p>
                <p style={{ color: '#6e7687', fontSize: '12px' }}>
                  Blobs: {d.blobCount} ({d.utilizationPct}%)
                </p>
              </div>
            );
          }}
        />
        <ReferenceLine
          y={393216}
          stroke={COLORS.purple}
          strokeDasharray="5 5"
          strokeOpacity={0.7}
          label={{ value: 'Target', fill: '#6e7687', fontSize: 10, position: 'right' }}
        />
        <Bar dataKey="blobGasUsed" radius={[2, 2, 0, 0]} maxBarSize={20}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.blobGasUsed > entry.targetGas ? COLORS.red : COLORS.green}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
