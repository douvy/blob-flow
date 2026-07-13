"use client";

import React from 'react';
import { CHART_TOOLTIP_STYLE } from '@/constants/chartTheme';

interface ChartTooltipFrameProps {
  label?: React.ReactNode;
  children: React.ReactNode;
}

/** Container for custom Recharts tooltip content, matching the shared dark tooltip chrome. */
export function ChartTooltipFrame({ label, children }: ChartTooltipFrameProps) {
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      {label != null && <p className="text-xs text-white mb-1">{label}</p>}
      {children}
    </div>
  );
}

interface ChartTooltipRowProps {
  label: string;
  value: React.ReactNode;
  /** Series color, shown as a swatch so text can stay readable on the dark background. */
  swatchColor?: string;
}

/** Tooltip series row: a colored swatch carries identity, the text stays high-contrast. */
export function ChartTooltipRow({ label, value, swatchColor }: ChartTooltipRowProps) {
  return (
    <p className="flex items-center gap-1.5 text-xs leading-5">
      {swatchColor !== undefined && (
        <span
          className="inline-block w-2 h-2 rounded-sm shrink-0"
          style={{ backgroundColor: swatchColor }}
        />
      )}
      <span className="text-[#b8bdc7]">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </p>
  );
}
