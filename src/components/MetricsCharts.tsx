"use client";

import React from 'react';
import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { useChartData } from '../hooks/useChartData';
import DataStateWrapper from './DataStateWrapper';
import { CHART_VIEWS } from './charts/chartViews';
import { CHART_CARD_CLASS } from '../constants/chartTheme';

// The base fee trend already leads the hero, so it's omitted here to avoid a
// duplicate graph. Its enlarged view stays reachable at /charts/base-fee.
const DATA_TRENDS_VIEWS = CHART_VIEWS.filter((view) => view.id !== 'base-fee');

export default function MetricsCharts() {
  const { chartData, isLoading, error } = useChartData();

  const loadingComponent = (
    <div className="flex flex-col space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#14161a] rounded-lg p-3 border border-divider">
          <div className="h-5 bg-[#26282e] rounded w-1/2 mb-3 animate-pulse" />
          <div className="h-56 bg-[#26282e] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <section id="data-trends" className="scroll-mt-20">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Data Trends</h2>
      <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
        {chartData && (
          <div className="flex flex-col space-y-6">
            {DATA_TRENDS_VIEWS.map((view) => (
              <div key={view.id} className={CHART_CARD_CLASS}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-md font-medium text-white">
                    {view.getTitle(chartData)}
                  </h3>
                  <Link
                    href={`/charts/${view.id}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-divider bg-[#1d1f23] text-blue transition-colors hover:bg-[#252936] hover:text-lightBlue focus:outline-none focus:ring-2 focus:ring-blue/60"
                    aria-label={`Open ${view.getTitle(chartData)} enlarged`}
                    title="Enlarge graph"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className={view.dashboardFrameClassName}>
                  {view.render(chartData)}
                </div>
              </div>
            ))}

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
