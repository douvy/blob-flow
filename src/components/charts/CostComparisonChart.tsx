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
import type { CostComparisonDataPoint } from '../../types';
import {
  CHART_TOOLTIP_STYLE,
  CHART_LABEL_STYLE,
  AXIS_STROKE,
  AXIS_LINE,
  AXIS_TICK,
  COLORS,
} from '../../constants/chartTheme';
import { isolateLegendKey } from './legendIsolation';

interface CostComparisonChartProps {
  data: CostComparisonDataPoint[];
}

const SERIES_KEYS = ['blobCostEth', 'calldataEquivEth'];

function formatEth(value: number): string {
  if (value === 0) return '0';
  if (value < 0.000001) return value.toExponential(1);
  if (value < 0.001) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

export default function CostComparisonChart({ data }: CostComparisonChartProps) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const isolateKey = (key: string) => {
    setHiddenKeys((prev) => isolateLegendKey(prev, SERIES_KEYS, key));
  };

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
              const blobVisible = !hiddenKeys.has('blobCostEth');
              const calldataVisible = !hiddenKeys.has('calldataEquivEth');
              if (!blobVisible && !calldataVisible) return null;
              return (
                <div style={CHART_TOOLTIP_STYLE}>
                  <p style={{ color: '#fff', fontSize: '12px', marginBottom: 4 }}>{label}</p>
                  {blobVisible && (
                    <p style={{ color: COLORS.blue, fontSize: '12px' }}>
                      Blob: {formatEth(d.blobCostEth)} ETH
                    </p>
                  )}
                  {calldataVisible && (
                    <p style={{ color: COLORS.purple, fontSize: '12px' }}>
                      Calldata: {formatEth(d.calldataEquivEth)} ETH
                    </p>
                  )}
                  {blobVisible && calldataVisible && (
                    <p style={{ color: COLORS.green, fontSize: '12px' }}>
                      Savings: {d.savingsPct}%
                    </p>
                  )}
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
            hide={hiddenKeys.has('blobCostEth')}
          />
          <Line
            type="monotone"
            dataKey="calldataEquivEth"
            stroke={COLORS.purple}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="Calldata Equiv."
            hide={hiddenKeys.has('calldataEquivEth')}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[#6e7687]">
        <button
          type="button"
          onClick={() => isolateKey('blobCostEth')}
          aria-pressed={!hiddenKeys.has('blobCostEth')}
          className={`inline-flex items-center mr-4 cursor-pointer rounded px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${hiddenKeys.has('blobCostEth') ? 'opacity-40' : ''}`}
        >
          <span className="inline-block w-3 h-0.5 mr-1" style={{ backgroundColor: COLORS.blue }} />
          <span className={hiddenKeys.has('blobCostEth') ? 'line-through' : ''}>Blob Cost</span>
        </button>
        <button
          type="button"
          onClick={() => isolateKey('calldataEquivEth')}
          aria-pressed={!hiddenKeys.has('calldataEquivEth')}
          className={`inline-flex items-center mr-4 cursor-pointer rounded px-1 py-0.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${hiddenKeys.has('calldataEquivEth') ? 'opacity-40' : ''}`}
        >
          <span className="inline-block w-3 h-0.5 mr-1" style={{ backgroundColor: COLORS.purple }} />
          <span className={hiddenKeys.has('calldataEquivEth') ? 'line-through' : ''}>Calldata Equiv.</span>
        </button>
        {!hiddenKeys.has('blobCostEth') && !hiddenKeys.has('calldataEquivEth') && (
          <span className="inline-flex items-center">
            <span className="text-green">~{avgSavings}% savings</span>
          </span>
        )}
      </div>
    </>
  );
}
