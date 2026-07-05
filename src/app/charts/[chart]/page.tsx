"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Minimize2 } from 'lucide-react';
import DataStateWrapper from '@/components/DataStateWrapper';
import { useChartData } from '@/hooks/useChartData';
import { CHART_CARD_CLASS } from '@/constants/chartTheme';
import {
  CHART_VIEWS,
  ChartView,
  getChartView,
} from '@/components/charts/chartViews';
import type { ChartDataset } from '@/types';

function ChartTabs({ activeId }: { activeId?: string }) {
  return (
    <nav aria-label="Charts" className="flex flex-wrap gap-2">
      {CHART_VIEWS.map((chartView) => {
        const isActive = chartView.id === activeId;

        return (
          <Link
            key={chartView.id}
            href={`/charts/${chartView.id}`}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${isActive
              ? 'border-blue bg-blue/20 text-white'
              : 'border-divider bg-[#1d1f23] text-bodyText hover:bg-[#252936] hover:text-white'
              }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {chartView.shortTitle}
          </Link>
        );
      })}
    </nav>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-full min-h-[260px] items-center justify-center text-center">
      <div>
        <div className="text-lg font-medium text-white">No chart data available</div>
        <div className="mt-1 text-sm text-[#6e7687]">
          The selected network has not returned data for this view.
        </div>
      </div>
    </div>
  );
}

function getCoverageLabel(view: ChartView, chartData: ChartDataset): string {
  if (view.id === 'rolling-market-stats') {
    return chartData.rollingCoverageLabel;
  }

  return chartData.blockCoverageLabel;
}

function ChartDetail({ view }: { view: ChartView }) {
  const { chartData, isLoading, error } = useChartData();

  const loadingComponent = (
    <div className={CHART_CARD_CLASS}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-72 max-w-full rounded bg-[#202538] animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-[#202538] animate-pulse" />
        </div>
        <div className="h-8 w-24 rounded bg-[#202538] animate-pulse" />
      </div>
      <div className="h-[62vh] min-h-[360px] max-h-[720px] rounded bg-[#202538] animate-pulse" />
    </div>
  );

  return (
    <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
      {chartData && (
        <div className={CHART_CARD_CLASS}>
          <div className="relative z-10 mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-medium text-white">{view.getTitle(chartData)}</h2>
              <p className="mt-1 text-sm text-[#6e7687]">
                {getCoverageLabel(view, chartData)}
              </p>
            </div>
            <Link
              href="/#data-trends"
              className="inline-flex h-8 items-center justify-center gap-2 self-start rounded-md border border-divider bg-[#1d1f23] px-3 text-sm text-bodyText transition-colors hover:bg-[#252936] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue/60"
            >
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
          </div>
          <div className={view.detailFrameClassName}>
            {view.getPointCount(chartData) > 0 ? view.render(chartData) : <EmptyChartState />}
          </div>
        </div>
      )}
    </DataStateWrapper>
  );
}

function UnknownChart({ chartId }: { chartId: string | undefined }) {
  return (
    <div className="rounded-lg border border-divider bg-[#161a29]/80 p-6">
      <h1 className="text-2xl font-windsor-bold text-white mb-2">Chart not found</h1>
      <p className="text-bodyText text-sm mb-5">
        {chartId ? `There is no chart named "${chartId}".` : 'No chart was selected.'}
      </p>
      <ChartTabs />
    </div>
  );
}

export default function ChartDetailPage() {
  const params = useParams();
  const chartId = params.chart as string | undefined;
  const view = getChartView(chartId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        <Link
          href="/#data-trends"
          className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        {view ? (
          <section>
            <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-3xl font-windsor-bold text-white mb-2">
                  {view.shortTitle}
                </h1>
                <p className="max-w-2xl text-sm text-bodyText">
                  {view.description}
                </p>
              </div>
              <ChartTabs activeId={view.id} />
            </div>

            <ChartDetail view={view} />
          </section>
        ) : (
          <UnknownChart chartId={chartId} />
        )}
    </div>
  );
}
