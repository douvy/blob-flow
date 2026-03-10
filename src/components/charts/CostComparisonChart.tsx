"use client";

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CostComparisonDataPoint } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_LABEL_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  COLORS,
} from '../../constants/chartTheme';

interface CostComparisonChartProps {
  data: CostComparisonDataPoint[];
}

function formatEth(value: number): string {
  if (value === 0) return '0';
  if (value < 0.000001) return value.toExponential(1);
  if (value < 0.001) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

export default function CostComparisonChart({ data }: CostComparisonChartProps) {
  const avgSavings = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(
      data.reduce((sum, d) => sum + d.savingsPct, 0) / data.length
    );
  }, [data]);

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
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
            width={55}
            tickFormatter={formatEth}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_LABEL_STYLE}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0].payload as CostComparisonDataPoint;
              return (
                <div style={CHART_TOOLTIP_STYLE}>
                  <p style={{ color: '#fff', fontSize: '12px', marginBottom: 4 }}>{label}</p>
                  <p style={{ color: COLORS.blue, fontSize: '12px' }}>
                    Blob: {formatEth(d.blobCostEth)} ETH
                  </p>
                  <p style={{ color: COLORS.purple, fontSize: '12px' }}>
                    Calldata: {formatEth(d.calldataEquivEth)} ETH
                  </p>
                  <p style={{ color: COLORS.green, fontSize: '12px' }}>
                    Savings: {d.savingsPct}%
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="blobCostEth"
            stroke={COLORS.blue}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="Blob Cost"
          />
          <Line
            type="monotone"
            dataKey="calldataEquivEth"
            stroke={COLORS.purple}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="Calldata Equiv."
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[#6e7687]">
        <span className="inline-flex items-center mr-4">
          <span className="inline-block w-3 h-0.5 mr-1" style={{ backgroundColor: COLORS.blue }} />
          Blob Cost
        </span>
        <span className="inline-flex items-center mr-4">
          <span className="inline-block w-3 h-0.5 mr-1" style={{ backgroundColor: COLORS.purple }} />
          Calldata Equiv.
        </span>
        <span className="inline-flex items-center">
          <span className="text-green">~{avgSavings}% savings</span>
        </span>
      </div>
    </>
  );
}
