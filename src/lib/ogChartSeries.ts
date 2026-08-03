/**
 * Per-chart series extraction for social share cards. Each entry pulls the
 * same backend data its on-page chart plots and reduces it to one numeric
 * series plus a headline stat, which is all a card-sized rendering can show.
 */

import { api } from '@/lib/api';
import { DEFAULT_NETWORK } from '@/constants';
import { COLORS } from '@/constants/chartTheme';
import { formatGwei, formatNumber } from '@/utils';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartResponse,
  BackendCostComparisonChartResponse,
} from '@/types';

/** Cards summarize a day; long enough to show shape, short enough to stay current. */
const CARD_RANGE = '24h' as const;

/**
 * Share cards have no user session to read a network preference from, and
 * the backend rejects chart requests that omit the network entirely, so
 * cards always show the default network.
 */
export const OG_CARD_NETWORK = DEFAULT_NETWORK;

const WEI_PER_ETH = 1e18;

export interface OgChartSeries {
  values: number[];
  /** Short caption under the chart, e.g. "avg 0.0031 Gwei". */
  caption: string;
  stroke: string;
  fill: string;
}

/**
 * Drops the final bucket, which covers the time since the last boundary and
 * is therefore still filling: on summed series it renders as a cliff to
 * zero, and on averaged ones a bucket holding one or two blocks swings wide
 * enough to skew the whole vertical scale. Short series keep every point,
 * where losing one would distort the shape more than the partial bucket does.
 */
export function withoutPartialBucket<T>(points: readonly T[]): readonly T[] {
  return points.length > 8 ? points.slice(0, -1) : points;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function baseFeeSeries(market: BackendBlobMarketChartResponse): OgChartSeries {
  const values = withoutPartialBucket(market.points).map((point) =>
    Number(point.average_blob_base_fee_gwei)
  );
  return {
    values,
    caption: `avg ${formatGwei(average(values), 4)} over 24h`,
    stroke: COLORS.blue,
    fill: COLORS.blue,
  };
}

function utilizationSeries(market: BackendBlobMarketChartResponse): OgChartSeries {
  // The backend reports utilization as a 0-1 fraction.
  const values = withoutPartialBucket(market.points).map(
    (point) => Number(point.average_utilization) * 100
  );
  return {
    values,
    caption: `avg ${average(values).toFixed(1)}% of target over 24h`,
    stroke: COLORS.green,
    fill: COLORS.green,
  };
}

function blobUsageSeries(usage: BackendAttributionUsageChartResponse): OgChartSeries {
  const values = withoutPartialBucket(usage.points).map((point) =>
    sum(Object.values(point.values).map((value) => value.blob_count))
  );
  return {
    values,
    caption: `${formatNumber(Math.round(sum(values)))} blobs over 24h`,
    stroke: COLORS.purple,
    fill: COLORS.purple,
  };
}

function costSeries(cost: BackendCostComparisonChartResponse): OgChartSeries {
  const values = withoutPartialBucket(cost.points).map(
    (point) => Number(point.blob_cost_wei) / WEI_PER_ETH
  );
  const total = sum(values);
  return {
    values,
    caption: `${total.toFixed(total < 0.001 ? 6 : 4)} ETH on blobs over 24h`,
    stroke: COLORS.yellow,
    fill: COLORS.yellow,
  };
}

function blobCountSeries(market: BackendBlobMarketChartResponse): OgChartSeries {
  const values = withoutPartialBucket(market.points).map((point) => point.blob_count);
  return {
    values,
    caption: `${formatNumber(Math.round(sum(values)))} blobs over 24h`,
    stroke: COLORS.lightBlue,
    fill: COLORS.lightBlue,
  };
}

/**
 * Fetches the series behind a chart slug. Returns null for an unknown slug
 * or any backend failure, so the card degrades to its text-only form rather
 * than failing the image request.
 */
export async function fetchOgChartSeries(slug: string): Promise<OgChartSeries | null> {
  try {
    const network = OG_CARD_NETWORK.apiParam;
    switch (slug) {
      case 'base-fee':
        return baseFeeSeries(await api.getBlobMarketChart(CARD_RANGE, network));
      case 'gas-utilization':
        return utilizationSeries(await api.getBlobMarketChart(CARD_RANGE, network));
      case 'blob-usage':
        return blobUsageSeries(await api.getAttributionUsageChart(CARD_RANGE, network));
      case 'cost-comparison':
        return costSeries(await api.getCostComparisonChart(CARD_RANGE, network));
      case 'rolling-market-stats':
        return blobCountSeries(await api.getBlobMarketChart(CARD_RANGE, network));
      default:
        return null;
    }
  } catch {
    return null;
  }
}
