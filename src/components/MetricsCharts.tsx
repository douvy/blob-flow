"use client";

import React from 'react';
import { useChartData } from '../hooks/useChartData';
import DataStateWrapper from './DataStateWrapper';
import BaseFeeChart from './charts/BaseFeeChart';
import GasUtilizationChart from './charts/GasUtilizationChart';
import FeeIndicators from './charts/FeeIndicators';
import RollingWindowStats from './charts/RollingWindowStats';
import { CHART_CARD_CLASS } from '../constants/chartTheme';

export default function MetricsCharts() {
  const { chartData, isLoading, error } = useChartData();

  const loadingComponent = (
    <div className="flex flex-col space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#161a29]/80 rounded-lg p-3 border border-divider">
          <div className="h-5 bg-[#202538] rounded w-1/2 mb-3 animate-pulse" />
          <div className="h-56 bg-[#202538] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-3">Data Trends</h2>
      <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
        {chartData && (
          <div className="flex flex-col space-y-6">
            {/* Fee Market Indicators */}
            <FeeIndicators
              indicators={chartData.indicators}
              selectedWindow={chartData.selectedWindow}
            />

            {/* Base Fee over Recent Blocks */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Base Fee over {chartData.chartRangeLabel} (Gwei)
              </h3>
              <div className="h-56 relative">
                <BaseFeeChart
                  data={chartData.baseFee}
                  referenceBaseFeeGwei={chartData.selectedWindow?.averageBaseFeeGwei}
                />
              </div>
            </div>

            {/* Blob Gas Utilization */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Blob Gas Utilization over {chartData.chartRangeLabel}
              </h3>
              <div className="h-56 relative">
                <GasUtilizationChart
                  data={chartData.gasUtilization}
                  averageUtilizationPct={chartData.selectedWindow?.averageUtilizationPct}
                />
              </div>
            </div>

            {/* Rolling Window Stats */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Rolling Market Stats
              </h3>
              <div className="relative">
                <RollingWindowStats
                  windows={chartData.rollingWindows}
                  selectedWindow={chartData.selectedWindow}
                />
              </div>
            </div>

            {/* Data coverage note */}
            <p className="text-xs text-[#6e7687] text-center">
              {chartData.coverageLabel}
            </p>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
