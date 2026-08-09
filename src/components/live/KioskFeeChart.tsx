"use client";

import React from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { COLORS } from '@/constants/chartTheme';
import type { KioskChartPoint } from '@/lib/liveKiosk';

/**
 * Last-hour fee curve along the bottom of the headline panel. The big number
 * above is the reading; this shows its shape, so it carries no axes, ticks,
 * or tooltip (the kiosk has no pointer). The dashed line is the window
 * average. Animation stays off so a landing block never redraws the whole
 * curve.
 *
 * Memoized: the panel re-renders every second for the "Xs ago" caption, and
 * the curve only changes when a block lands.
 */
const KioskFeeChart = React.memo(function KioskFeeChart({
  points,
  averageGwei,
}: {
  points: KioskChartPoint[];
  averageGwei?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="kioskFeeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Hidden domain axis: the scale exists so the curve is honest, the
            numbers live in the readout and the low/high caption instead. */}
        <YAxis hide domain={['auto', 'auto']} />
        {averageGwei !== undefined && averageGwei > 0 && (
          <ReferenceLine
            y={averageGwei}
            stroke={COLORS.purple}
            strokeDasharray="6 6"
            strokeOpacity={0.6}
          />
        )}
        <Area
          type="monotone"
          dataKey="fee"
          stroke={COLORS.blue}
          strokeWidth={2.5}
          fill="url(#kioskFeeGradient)"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export default KioskFeeChart;
