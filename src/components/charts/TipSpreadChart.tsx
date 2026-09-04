"use client";

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BlobTipDataPoint } from '../../types';
import { AXIS_STROKE, AXIS_LINE, AXIS_TICK, COLORS } from '../../constants/chartTheme';
import { formatGwei } from '@/utils';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { formatGweiTick } from './tipFormat';

interface TipSpreadChartProps {
  data: BlobTipDataPoint[];
}

const SPREAD_SERIES = [
  { key: 'medianGwei', name: 'Median', color: COLORS.blue },
  { key: 'p95Gwei', name: 'P95', color: COLORS.purple },
  { key: 'maxGwei', name: 'Max', color: COLORS.yellow },
] as const;

/**
 * Median, 95th percentile, and highest tip per bucket, with the band between
 * median and p95 shaded so a widening gap (one sender bidding far above the
 * market) is visible before the lines themselves separate.
 */
export default function TipSpreadChart({ data }: TipSpreadChartProps) {
  const plotData = useMemo(
    () => data.map((point) => ({ ...point, band: [point.medianGwei, point.p95Gwei] })),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        Tip data unavailable
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={plotData} margin={{ top: 5, right: 10, left: 0, bottom: 32 }}>
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
              const point = payload[0].payload as BlobTipDataPoint;
              return (
                <ChartTooltipFrame label={label}>
                  {SPREAD_SERIES.map((series) => (
                    <ChartTooltipRow
                      key={series.key}
                      swatchColor={series.color}
                      label={series.name}
                      value={formatGwei(point[series.key], 4)}
                    />
                  ))}
                  <ChartTooltipRow label="Average" value={formatGwei(point.averageGwei, 4)} />
                  <ChartTooltipRow
                    label="Blobs"
                    value={`${point.blobCount} ${point.blobCount === 1 ? 'blob' : 'blobs'}`}
                  />
                </ChartTooltipFrame>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill={COLORS.purple}
            fillOpacity={0.12}
            name="Median to P95"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
          {SPREAD_SERIES.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              stroke={series.color}
              strokeWidth={series.key === 'maxGwei' ? 1.5 : 2}
              name={series.name}
              dot={plotData.length === 1 ? { r: 3, fill: series.color } : false}
              activeDot={{ r: 4, fill: series.color }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-[#6e7687]">
        {SPREAD_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center px-1 py-0.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm mr-1"
              style={{ backgroundColor: series.color }}
            />
            {series.name}
          </span>
        ))}
      </div>
    </>
  );
}
