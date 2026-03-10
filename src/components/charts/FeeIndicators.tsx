"use client";

import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import type { FeeMarketIndicators } from '../../types';
import { COLORS } from '../../constants/chartTheme';

interface FeeIndicatorsProps {
  indicators: FeeMarketIndicators;
}

export default function FeeIndicators({ indicators }: FeeIndicatorsProps) {
  const {
    currentBaseFeeGwei,
    averageBaseFeeGwei,
    feeRatio,
    pendingBlobCount,
    recentBaseFeeSparkline,
  } = indicators;

  const isHigh = feeRatio > 1;
  const sparkData = recentBaseFeeSparkline.map((value, i) => ({ value, i }));
  const sparkColor = isHigh ? COLORS.red : COLORS.green;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Current Base Fee */}
      <div className="bg-[#161a29]/80 rounded-lg p-3 border border-divider">
        <div className="text-[11px] text-[#6e7687] mb-1">Current Base Fee</div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-medium text-white">
              {currentBaseFeeGwei.toFixed(2)}
            </span>
            <span className="text-xs text-[#6e7687] ml-1">Gwei</span>
          </div>
          {sparkData.length > 1 && (
            <div style={{ width: 70, height: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparkColor}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[11px] ${isHigh ? 'text-red' : 'text-green'}`}>
            {isHigh ? '\u25B2' : '\u25BC'} {((feeRatio - 1) * 100).toFixed(0)}% vs avg
          </span>
          <span className="text-[11px] text-[#6e7687]">
            ({averageBaseFeeGwei.toFixed(2)} Gwei)
          </span>
        </div>
      </div>

      {/* Mempool Pressure */}
      <div className="bg-[#161a29]/80 rounded-lg p-3 border border-divider">
        <div className="text-[11px] text-[#6e7687] mb-1">Mempool Pressure</div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-medium text-white">
              {pendingBlobCount}
            </span>
            <span className="text-xs text-[#6e7687] ml-1">pending</span>
          </div>
          <div className="flex items-center">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.min(60, Math.max(8, pendingBlobCount * 4))}px`,
                backgroundColor: pendingBlobCount > 10 ? COLORS.red : pendingBlobCount > 5 ? COLORS.yellow : COLORS.green,
                opacity: 0.8,
              }}
            />
          </div>
        </div>
        <div className="text-[11px] text-[#6e7687] mt-1">
          {pendingBlobCount === 0
            ? 'Clear'
            : pendingBlobCount <= 3
              ? 'Low'
              : pendingBlobCount <= 10
                ? 'Moderate'
                : 'High'}
          {' '}congestion
        </div>
      </div>
    </div>
  );
}
