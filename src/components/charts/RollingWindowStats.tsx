"use client";

import React from 'react';
import type { RollingWindowDataPoint } from '../../types';
import { formatScientific, RUNAWAY_GWEI_THRESHOLD } from '../../utils';

interface RollingWindowStatsProps {
  windows: RollingWindowDataPoint[];
  selectedWindow: RollingWindowDataPoint | null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatGwei(value: number): string {
  if (value === 0) return '0';
  // Runaway testnet fees are unreadable spelled out: switch to "2.84e22".
  if (value >= RUNAWAY_GWEI_THRESHOLD) return formatScientific(value);
  if (value < 0.01) return value.toFixed(4);
  return value.toFixed(2);
}

function formatEth(value: number): string {
  if (value === 0) return '0';
  if (value < 0.000001) return value.toExponential(1);
  if (value < 0.001) return value.toFixed(6);
  return value.toFixed(4);
}

export default function RollingWindowStats({
  windows,
  selectedWindow,
}: RollingWindowStatsProps) {
  if (windows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#6e7687]">
        Rolling stats unavailable
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedWindow && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-[11px] uppercase text-[#6e7687]">Total blobs</div>
            <div className="text-white font-medium">{formatNumber(selectedWindow.totalBlobs)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-[#6e7687]">Total cost</div>
            <div className="text-white font-medium">{formatEth(selectedWindow.totalCostEth)} ETH</div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-[#6e7687]">Unique senders</div>
            <div className="text-white font-medium">{formatNumber(selectedWindow.uniqueSenders)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-[#6e7687]">Avg utilization</div>
            <div className="text-white font-medium">{selectedWindow.averageUtilizationPct.toFixed(1)}%</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#6e7687] border-b border-divider">
              <th className="py-2 pr-2 font-medium">Window</th>
              <th className="py-2 px-2 font-medium text-right">Avg</th>
              <th className="py-2 px-2 font-medium text-right">Median</th>
              <th className="py-2 px-2 font-medium text-right">P95</th>
              <th className="py-2 pl-2 font-medium text-right">Util</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((window) => {
              const isSelected = selectedWindow?.window === window.window;

              return (
                <tr
                  key={window.window}
                  className={`border-b border-divider/60 ${isSelected ? 'bg-[#26282e]/60 text-white' : 'text-[#b8bdc7]'}`}
                >
                  <td className="py-2 pr-2 font-medium">{window.label}</td>
                  <td className="py-2 px-2 text-right">{formatGwei(window.averageBaseFeeGwei)}</td>
                  <td className="py-2 px-2 text-right">{formatGwei(window.medianBaseFeeGwei)}</td>
                  <td className="py-2 px-2 text-right">{formatGwei(window.p95BaseFeeGwei)}</td>
                  <td className="py-2 pl-2 text-right">{window.averageUtilizationPct.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#6e7687]">
        Base fee columns are in Gwei.
      </p>
    </div>
  );
}
