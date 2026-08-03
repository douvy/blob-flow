"use client";

import React, { useCallback, useMemo } from 'react';
import { Clock3, Coins, Gauge, HardDrive, PiggyBank } from 'lucide-react';
import MetricCard from './MetricCard';
import DataStateWrapper from './DataStateWrapper';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import {
  getBackendChartRange,
  selectRollingWindow,
  transformStatsWindows,
} from '../lib/chartAggregation';
import { useNetwork } from '../hooks/useNetwork';
import { useTimeRange } from '../contexts/TimeRangeContext';
import {
  BackendAttributionUsageChartResponse,
  BackendCostComparisonChartResponse,
  BackendStatsWindowsResponse,
} from '../types';
import {
  blobCountToBytes,
  computeBlobBytesPerSecond,
  computeCostPerMibWei,
  computeSecondsPerBlob,
  durationSecondsBetween,
  formatBlobCadence,
  formatBlobCount,
  formatCostEthOrWei,
  formatDataComparison,
  formatDataRate,
  formatDataVolume,
  formatPercent,
  formatSignedWeiToEth,
  selectTopUsageShare,
} from '../utils';

const SECONDS_PER_DAY = 86400;

/**
 * Derived stats that translate the raw window metrics into everyday units:
 * cost per MB posted, blob cadence, sustained bandwidth, savings vs
 * calldata, and total data volume. Every card follows the global time range
 * filter, and the query
 * keys deliberately match LiveMetrics (stats-windows) and useChartData
 * (chart-attribution, chart-cost-comparison) so the strip reads the same
 * cache entries instead of issuing extra requests.
 */
export default function RelatableStats() {
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const network = selectedNetwork.apiParam;
  const backendRange = getBackendChartRange(timeRange);

  const fetchStatsWindows = useCallback(
    () => api.getStatsWindows(undefined, network),
    [network]
  );

  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(backendRange, network),
    [backendRange, network]
  );

  const fetchCostComparison = useCallback(
    () => api.getCostComparisonChart(backendRange, network),
    [backendRange, network]
  );

  const {
    data: statsWindows,
    isLoading: windowsLoading,
    error: windowsError,
    dataUpdatedAt: windowsUpdatedAt,
  } = useApiData<BackendStatsWindowsResponse>(fetchStatsWindows, ['stats-windows', network]);

  const {
    data: attribution,
    isLoading: attributionLoading,
  } = useApiData<BackendAttributionUsageChartResponse>(
    fetchAttribution,
    ['chart-attribution', network, backendRange]
  );

  const {
    data: costComparison,
    isLoading: costComparisonLoading,
  } = useApiData<BackendCostComparisonChartResponse>(
    fetchCostComparison,
    ['chart-cost-comparison', network, backendRange]
  );

  const selectedWindow = useMemo(() => {
    if (!statsWindows) return null;
    return selectRollingWindow(transformStatsWindows(statsWindows), timeRange);
  }, [statsWindows, timeRange]);

  // The cost-per-MB math runs in BigInt wei, so it needs the raw window's
  // cost strings rather than the transformed window's lossy ETH number.
  const rawWindow = useMemo(() => {
    if (!statsWindows || !selectedWindow) return undefined;
    return statsWindows.windows.find((window) => window.window === selectedWindow.window);
  }, [statsWindows, selectedWindow]);

  const metrics = useMemo(() => {
    if (!selectedWindow) return [];
    const label = selectedWindow.label;
    const totalBlobs = selectedWindow.totalBlobs;

    const costPerMibWei = rawWindow
      ? computeCostPerMibWei(
        rawWindow.total_blobs,
        rawWindow.total_cost_wei,
        rawWindow.total_cost_eth
      )
      : null;

    const secondsPerBlob = computeSecondsPerBlob(totalBlobs, selectedWindow.durationSeconds);

    const topShare = selectTopUsageShare(attribution?.summary.shares ?? []);
    const attributionDuration = attribution
      ? durationSecondsBetween(attribution.start_time, attribution.end_time)
      : null;
    const topShareCadence =
      topShare && attributionDuration !== null
        ? formatBlobCadence(computeSecondsPerBlob(topShare.blob_count, attributionDuration))
        : null;

    const savings = formatSignedWeiToEth(costComparison?.summary.savings_wei);
    const savingsPercent = costComparison?.summary.savings_percent;

    const postedBytes = blobCountToBytes(totalBlobs);
    const bytesPerSecond = computeBlobBytesPerSecond(totalBlobs, selectedWindow.durationSeconds);
    // Seeding from the fetch timestamp keeps the pick pure for a given
    // render while advancing it whenever the window data refreshes.
    const comparison = formatDataComparison(postedBytes, Math.floor(windowsUpdatedAt / 1000));

    return [
      {
        title: `Cost per MB (${label})`,
        value: costPerMibWei === null ? '-' : formatCostEthOrWei(costPerMibWei.toString()),
        description:
          costPerMibWei === null
            ? 'No blob costs in this window'
            : `${formatBlobCount(totalBlobs)} at 128 KiB each`,
        icon: Coins,
      },
      {
        title: `Blob Cadence (${label})`,
        value: secondsPerBlob === null ? '-' : `Every ${formatBlobCadence(secondsPerBlob)}`,
        description:
          topShare && topShareCadence && topShareCadence !== '-'
            ? `${topShare.name}: one every ${topShareCadence}`
            : 'Across every blob poster',
        icon: Clock3,
      },
      {
        title: `Blob Bandwidth (${label})`,
        value: formatDataRate(bytesPerSecond),
        description:
          bytesPerSecond !== null
            ? `${formatDataVolume(bytesPerSecond * SECONDS_PER_DAY)} per day at this pace`
            : 'No blob data in this window',
        icon: Gauge,
      },
      {
        title: `Saved vs Calldata (${timeRange})`,
        value: savings ?? '-',
        description:
          savings !== null && savingsPercent !== undefined
            ? `${formatPercent(Math.abs(savingsPercent))} ${
              savingsPercent >= 0 ? 'cheaper' : 'pricier'
            } than posting calldata`
            : 'Calldata comparison unavailable',
        icon: PiggyBank,
      },
      {
        title: `Data Posted (${label})`,
        value: formatDataVolume(postedBytes),
        // Rotates through the comparison pool as the window data refreshes,
        // so the card offers a different frame of reference over time.
        description: comparison
          ? `About the same as ${comparison}`
          : `${formatBlobCount(totalBlobs)} of 128 KiB each`,
        icon: HardDrive,
      },
    ];
  }, [selectedWindow, rawWindow, attribution, costComparison, timeRange, windowsUpdatedAt]);

  const isLoading = windowsLoading || attributionLoading || costComparisonLoading;
  const haveHeadline = Boolean(selectedWindow);

  const loadingComponent = (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="animate-pulse bg-[#14161a] rounded-lg p-5 border border-divider">
          <div className="h-5 bg-[#26282e] rounded w-3/4 mb-3"></div>
          <div className="h-7 bg-[#26282e] rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-[#26282e] rounded w-5/6"></div>
        </div>
      ))}
    </div>
  );

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Blob Math</h2>

      <DataStateWrapper
        isLoading={isLoading && !haveHeadline}
        error={haveHeadline ? null : windowsError}
        loadingComponent={loadingComponent}
      >
        {selectedWindow && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                description={metric.description}
                icon={metric.icon}
              />
            ))}
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
