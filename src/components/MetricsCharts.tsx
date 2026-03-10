"use client";

import React from 'react';
import { useChartData } from '../hooks/useChartData';
import DataStateWrapper from './DataStateWrapper';
import BaseFeeChart from './charts/BaseFeeChart';
import GasUtilizationChart from './charts/GasUtilizationChart';
import L2UsageChart from './charts/L2UsageChart';
import CostComparisonChart from './charts/CostComparisonChart';
import FeeIndicators from './charts/FeeIndicators';
import { CHART_CARD_CLASS } from '../constants/chartTheme';

export default function MetricsCharts() {
  const { chartData, isLoading, error, dataPoints } = useChartData();

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
            <FeeIndicators indicators={chartData.indicators} />

            {/* Base Fee over Time */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Base Fee over Time (Gwei)
              </h3>
              <div className="h-56 relative">
                <BaseFeeChart data={chartData.baseFee} />
              </div>
            </div>

            {/* Blob Gas Utilization */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Blob Gas Utilization vs Target
              </h3>
              <div className="h-56 relative">
                <GasUtilizationChart data={chartData.gasUtilization} />
              </div>
            </div>

            {/* L2 Usage Breakdown */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Usage by L2 Network
              </h3>
              <div className="h-56 relative">
                <L2UsageChart data={chartData.l2Usage} />
              </div>
            </div>

            {/* Cost Comparison */}
            <div className={CHART_CARD_CLASS}>
              <h3 className="text-md font-medium mb-4 text-white">
                Cost: Blob vs Calldata Equivalent (ETH)
              </h3>
              <div className="h-56 relative">
                <CostComparisonChart data={chartData.costComparison} />
              </div>
            </div>

            {/* Data coverage note */}
            <p className="text-xs text-[#6e7687] text-center">
              Based on {dataPoints.toLocaleString()} recent blob transactions
            </p>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
