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
  averageUtilizationPct?: number;
}

function formatGas(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export default function GasUtilizationChart({ data, averageUtilizationPct }: GasUtilizationChartProps) {
  const targetGas = data.find((entry) => entry.targetGas > 0)?.targetGas ?? 0;
  const maxGas = data.find((entry) => entry.maxGas > 0)?.maxGas ?? 0;
  const averageGasUsed = targetGas > 0 && averageUtilizationPct !== undefined
    ? Math.round((targetGas * averageUtilizationPct) / 100)
    : 0;
  const referenceMax = Math.max(targetGas, maxGas, averageGasUsed);

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
          domain={[
            0,
            (dataMax: number) => {
              const maxValue = Math.max(dataMax, referenceMax);
              return maxValue > 0 ? Math.ceil(maxValue * 1.08) : 1;
            },
          ]}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_LABEL_STYLE}
          formatter={(value, name) => {
            const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
            const dataName = String(name ?? '');

            if (dataName === 'blobGasUsed') return [formatGas(numericValue), 'Gas Used'];
            return [Number.isFinite(numericValue) ? numericValue : String(value ?? ''), dataName];
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
                {d.maxGas > 0 && (
                  <p style={{ color: COLORS.lightBlue, fontSize: '12px' }}>
                    Max: {formatGas(d.maxGas)}
                  </p>
                )}
                <p style={{ color: '#6e7687', fontSize: '12px' }}>
                  Blobs: {d.blobCount} ({d.utilizationPct}%)
                </p>
              </div>
            );
          }}
        />
        {targetGas > 0 && (
          <ReferenceLine
            y={targetGas}
            stroke={COLORS.purple}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
            label={{ value: 'Target', fill: '#6e7687', fontSize: 10, position: 'right' }}
          />
        )}
        {maxGas > 0 && (
          <ReferenceLine
            y={maxGas}
            stroke={COLORS.lightBlue}
            strokeDasharray="6 4"
            strokeOpacity={0.7}
            label={{ value: 'Max', fill: '#6e7687', fontSize: 10, position: 'insideRight' }}
          />
        )}
        {averageGasUsed > 0 && (
          <ReferenceLine
            y={averageGasUsed}
            stroke={COLORS.yellow}
            strokeDasharray="3 4"
            strokeOpacity={0.65}
            label={{ value: 'Avg', fill: '#6e7687', fontSize: 10, position: 'insideRight' }}
          />
        )}
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
