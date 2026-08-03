import type {
  ApiResponse,
  BackendBlobRecordsResponse,
  BlobRecords,
} from '../../types';
import { deriveBlobRecords, RECORDS_TOP_LIMIT } from '../records';
import { getAttributionUsageChart } from './charts';
import { fetchApi } from './core';
import { getBlobPricing } from './pricing';
import { getStats, getStatsWindows } from './stats';

/**
 * Fetch the dedicated historical records endpoint (streak leaderboards,
 * all-time base fee peaks, busiest hours). This endpoint is proposed in
 * blob-indexer-api and 404s on backends that predate it; getBlobRecords
 * treats that as "no history" and falls back to live and windowed figures.
 */
export async function getIndexerRecords(
  network?: string,
  limit: number = RECORDS_TOP_LIMIT
): Promise<BackendBlobRecordsResponse> {
  const response = await fetchApi<ApiResponse<BackendBlobRecordsResponse>>(
    `/records?limit=${limit}`,
    network
  );

  return response.data;
}

function fulfilledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

function firstRejection(
  results: PromiseSettledResult<unknown>[]
): Error {
  for (const result of results) {
    if (result.status === 'rejected' && result.reason instanceof Error) {
      return result.reason;
    }
  }
  return new Error('Failed to load records data');
}

/**
 * Assemble blob market records for the /records page.
 *
 * True historical leaderboards come from GET /records when the backend
 * supports it. The remaining sections (and the fallbacks for the historical
 * ones) are derived client-side from the pricing, rolling-window, all-time
 * stats, and attribution endpoints (src/lib/records.ts).
 *
 * Sources fail independently: a failed endpoint nulls its sections rather
 * than failing the page. The historical endpoint's failure is expected on
 * older backends and never counts toward the all-failed error below.
 *
 * @param network - Optional network parameter
 */
export async function getBlobRecords(network?: string): Promise<BlobRecords> {
  const [pricing, statsWindows, stats, attribution, records] =
    await Promise.allSettled([
      getBlobPricing(network),
      getStatsWindows(undefined, network),
      getStats(network),
      // All-time range so spend and milestone counters cover each entity's
      // full history. Granularity is pinned to day buckets; only the summary
      // shares are read.
      getAttributionUsageChart('all', network, 'day'),
      getIndexerRecords(network),
    ]);

  const sources = {
    pricing: fulfilledValue(pricing),
    statsWindows: fulfilledValue(statsWindows),
    stats: fulfilledValue(stats),
    attribution: fulfilledValue(attribution),
    records: fulfilledValue(records),
  };

  if (
    !sources.pricing &&
    !sources.statsWindows &&
    !sources.stats &&
    !sources.attribution
  ) {
    throw firstRejection([pricing, statsWindows, stats, attribution]);
  }

  return deriveBlobRecords(sources);
}
