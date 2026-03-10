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
  ReferenceLine,
} from 'recharts';
import type { BaseFeeDataPoint } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_LABEL_STYLE,
  CHART_ITEM_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  COLORS,
} from '../../constants/chartTheme';

interface BaseFeeChartProps {
  data: BaseFeeDataPoint[];
}

export default function BaseFeeChart({ data }: BaseFeeChartProps) {
  const avgBaseFee = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(
      (data.reduce((sum, d) => sum + d.baseFeeGwei, 0) / data.length) * 1000
    ) / 1000;
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id="baseFeeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_LABEL_STYLE}
          itemStyle={CHART_ITEM_STYLE}
          formatter={(value: number) => [`${value.toFixed(3)} Gwei`, 'Base Fee']}
        />
        <ReferenceLine
          y={avgBaseFee}
          stroke={COLORS.purple}
          strokeDasharray="5 5"
          strokeOpacity={0.7}
        />
        <Area
          type="monotone"
          dataKey="baseFeeGwei"
          stroke={COLORS.blue}
          strokeWidth={2}
          fill="url(#baseFeeGradient)"
          name="Base Fee"
          dot={false}
          activeDot={{ r: 4, fill: COLORS.blue }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
