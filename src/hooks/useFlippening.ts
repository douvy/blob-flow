"use client";

import { useCallback, useMemo } from 'react';
import { ATTRIBUTION_ENTITY_LIMIT } from '@/constants';
import { useApiData } from './useApiData';
import { useNetwork } from './useNetwork';
import { useTimeRange, type TimeRange } from '../contexts/TimeRangeContext';
import { api } from '../lib/api';
import { analyzeFlippening, type FlippeningAnalysis } from '../lib/flippening';
import type { BackendAttributionUsageChartResponse, BackendChartRange } from '../types';

const REFRESH_INTERVAL_MS = 60_000;

/** The rolling share window is the header's time filter. */
export const FLIPPENING_WINDOW_SECONDS: Record<TimeRange, number> = {
  '1h': 3_600,
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
};

/**
 * History fetched for each window: one step longer than the filter, so the
 * rolling share has room to move and crossings show up in the feed.
 */
export const FLIPPENING_HISTORY_RANGE: Record<TimeRange, BackendChartRange> = {
  '1h': '24h',
  '24h': '7d',
  '7d': '30d',
  '30d': 'all',
};

/**
 * Crossover analysis for the selected network and time filter. The dashboard
 * strip and the full page share this hook, so they share one cached request
 * and can never disagree about who is ahead.
 */
export function useFlippening(): {
  analysis: FlippeningAnalysis | null;
  timeRange: TimeRange;
  historyRange: BackendChartRange;
  isLoading: boolean;
  error: Error | null;
} {
  const { timeRange } = useTimeRange();
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const historyRange = FLIPPENING_HISTORY_RANGE[timeRange];

  // Without an explicit limit the backend breaks out only its top few posters
  // and folds the rest into "other", so a rollup outside that default could
  // never appear in the standings and its crossovers would never be detected.
  const fetchAttribution = useCallback(
    () => api.getAttributionUsageChart(historyRange, network, 'auto', ATTRIBUTION_ENTITY_LIMIT),
    [historyRange, network]
  );

  const { data, isLoading, error } = useApiData<BackendAttributionUsageChartResponse>(
    fetchAttribution,
    ['flippening-attribution', network, historyRange, ATTRIBUTION_ENTITY_LIMIT],
    { refetchInterval: REFRESH_INTERVAL_MS }
  );

  const analysis = useMemo(
    () =>
      data
        ? analyzeFlippening(data, { windowSeconds: FLIPPENING_WINDOW_SECONDS[timeRange] })
        : null,
    [data, timeRange]
  );

  return { analysis, timeRange, historyRange, isLoading: isLoading && !data, error };
}
