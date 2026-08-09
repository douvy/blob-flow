/**
 * Per-chart series extraction for social share cards. Each entry pulls the
 * same backend data its on-page chart plots and reduces it to one numeric
 * series plus a headline stat, which is all a card-sized rendering can show.
 */

import { api } from '@/lib/api';
import { DEFAULT_NETWORK, DEFAULT_TIME_RANGE, type TimeRange } from '@/constants';
import type { Network } from '@/types';
import { COLORS } from '@/constants/chartTheme';
import { formatGwei, formatNumber } from '@/utils';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartResponse,
  BackendCostComparisonChartResponse,
} from '@/types';

/**
 * A share link carries the sharer's selected range and network, so a link to
 * a 7d Sepolia view does not unfurl as 1h mainnet. A link without them (a
 * hand-typed URL) has to match what the page itself will show, which is the
 * app defaults.
 */
export const OG_CARD_DEFAULT_RANGE: TimeRange = DEFAULT_TIME_RANGE;
export const OG_CARD_DEFAULT_NETWORK: Network = DEFAULT_NETWORK;

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

/**
 * Keeps only finite, non-negative readings. A backend field that is missing
 * or unparseable would otherwise reach the caption as NaN, and none of these
 * metrics (fees, utilization, counts, cost) can legitimately go negative.
 * Filtering here rather than in the renderer matters because captions are
 * computed from the same values.
 */
function plottable(values: readonly number[]): number[] {
  return values.filter((value) => Number.isFinite(value) && value >= 0);
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function baseFeeSeries(
  market: BackendBlobMarketChartResponse,
  range: TimeRange
): OgChartSeries | null {
  const values = plottable(
    withoutPartialBucket(market.points).map((point) =>
      Number(point.average_blob_base_fee_gwei)
    )
  );
  if (values.length === 0) return null;
  return {
    values,
    caption: `avg ${formatGwei(average(values), 4)} over ${range}`,
    stroke: COLORS.blue,
    fill: COLORS.blue,
  };
}

function utilizationSeries(
  market: BackendBlobMarketChartResponse,
  range: TimeRange
): OgChartSeries | null {
  // The backend reports utilization as a 0-1 fraction.
  const values = plottable(
    withoutPartialBucket(market.points).map(
      (point) => Number(point.average_utilization) * 100
    )
  );
  if (values.length === 0) return null;
  return {
    values,
    caption: `avg ${average(values).toFixed(1)}% of target over ${range}`,
    stroke: COLORS.green,
    fill: COLORS.green,
  };
}

function blobUsageSeries(
  usage: BackendAttributionUsageChartResponse,
  range: TimeRange
): OgChartSeries | null {
  const values = plottable(
    withoutPartialBucket(usage.points).map((point) =>
      sum(Object.values(point.values ?? {}).map((value) => Number(value?.blob_count)))
    )
  );
  if (values.length === 0) return null;
  return {
    values,
    caption: `${formatNumber(Math.round(sum(values)))} blobs over ${range}`,
    stroke: COLORS.purple,
    fill: COLORS.purple,
  };
}

function costSeries(
  cost: BackendCostComparisonChartResponse,
  range: TimeRange
): OgChartSeries | null {
  const values = plottable(
    withoutPartialBucket(cost.points).map(
      (point) => Number(point.blob_cost_wei) / WEI_PER_ETH
    )
  );
  if (values.length === 0) return null;
  const total = sum(values);
  return {
    values,
    caption: `${total.toFixed(total < 0.001 ? 6 : 4)} ETH on blobs over ${range}`,
    stroke: COLORS.yellow,
    fill: COLORS.yellow,
  };
}

function blobCountSeries(
  market: BackendBlobMarketChartResponse,
  range: TimeRange
): OgChartSeries | null {
  const values = plottable(
    withoutPartialBucket(market.points).map((point) => Number(point.blob_count))
  );
  if (values.length === 0) return null;
  return {
    values,
    caption: `${formatNumber(Math.round(sum(values)))} blobs over ${range}`,
    stroke: COLORS.lightBlue,
    fill: COLORS.lightBlue,
  };
}

/**
 * Fetches the series behind a chart slug. Returns null for an unknown slug
 * or any backend failure, so the card degrades to its text-only form rather
 * than failing the image request.
 */
export async function fetchOgChartSeries(
  slug: string,
  range: TimeRange = OG_CARD_DEFAULT_RANGE,
  selectedNetwork: Network = OG_CARD_DEFAULT_NETWORK
): Promise<OgChartSeries | null> {
  try {
    const network = selectedNetwork.apiParam;
    switch (slug) {
      case 'base-fee':
        return baseFeeSeries(await api.getBlobMarketChart(range, network), range);
      case 'gas-utilization':
        return utilizationSeries(await api.getBlobMarketChart(range, network), range);
      case 'blob-usage':
        return blobUsageSeries(await api.getAttributionUsageChart(range, network), range);
      case 'cost-comparison':
        return costSeries(await api.getCostComparisonChart(range, network), range);
      case 'rolling-market-stats':
        return blobCountSeries(await api.getBlobMarketChart(range, network), range);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
