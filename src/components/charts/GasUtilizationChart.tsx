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
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  COLORS,
} from '../../constants/chartTheme';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';

interface GasUtilizationChartProps {
  data: GasUtilizationDataPoint[];
  averageUtilizationPct?: number;
}

function formatGas(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

/**
 * All reference labels anchor at the right edge, so when the Avg line sits close
 * to Target or Max (e.g. average utilization near 100%) their 10px labels would
 * overprint. Anchor Avg at the left edge in that case.
 */
export function getAvgLabelPosition(
  targetGas: number,
  maxGas: number,
  averageGasUsed: number
): 'insideLeft' | 'insideRight' {
  const referenceMax = Math.max(targetGas, maxGas, averageGasUsed);
  const domainMax = referenceMax > 0 ? referenceMax * 1.08 : 1;
  const nearOtherLabel = averageGasUsed > 0 && [targetGas, maxGas].some(
    (value) => value > 0 && Math.abs(averageGasUsed - value) / domainMax < 0.08
  );
  return nearOtherLabel ? 'insideLeft' : 'insideRight';
}

export default function GasUtilizationChart({ data, averageUtilizationPct }: GasUtilizationChartProps) {
  const targetGas = data.find((entry) => entry.targetGas > 0)?.targetGas ?? 0;
  const maxGas = data.find((entry) => entry.maxGas > 0)?.maxGas ?? 0;
  const averageGasUsed = targetGas > 0 && averageUtilizationPct !== undefined
    ? Math.round((targetGas * averageUtilizationPct) / 100)
    : 0;
  const referenceMax = Math.max(targetGas, maxGas, averageGasUsed);
  const avgLabelPosition = getAvgLabelPosition(targetGas, maxGas, averageGasUsed);

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
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) return null;
            const d = payload[0].payload as GasUtilizationDataPoint;
            return (
              <ChartTooltipFrame label={label}>
                <ChartTooltipRow
                  swatchColor={d.blobGasUsed > d.targetGas ? COLORS.red : COLORS.green}
                  label="Gas"
                  value={formatGas(d.blobGasUsed)}
                />
                <ChartTooltipRow
                  swatchColor={COLORS.purple}
                  label="Target"
                  value={formatGas(d.targetGas)}
                />
                {d.maxGas > 0 && (
                  <ChartTooltipRow
                    swatchColor={COLORS.lightBlue}
                    label="Max"
                    value={formatGas(d.maxGas)}
                  />
                )}
                <ChartTooltipRow
                  label="Blobs"
                  value={`${d.blobCount} (${d.utilizationPct}%)`}
                />
              </ChartTooltipFrame>
            );
          }}
        />
        {targetGas > 0 && (
          <ReferenceLine
            y={targetGas}
            stroke={COLORS.purple}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
            label={{ value: 'Target', fill: '#6e7687', fontSize: 10, position: 'insideRight' }}
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
            label={{ value: 'Avg', fill: '#6e7687', fontSize: 10, position: avgLabelPosition }}
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
