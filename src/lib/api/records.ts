import type {
  ApiResponse,
  BackendBlobRecordsResponse,
  BlobRecords,
} from '../../types';
import { deriveBlobRecords, RECORDS_TOP_LIMIT } from '../records';
import { getAttributionUsageChart } from './charts';
import { fetchApi } from './core';
import { getStats } from './stats';

/**
 * Fetch the indexer's historical records endpoint: streak leaderboards,
 * base fee peaks, most expensive blocks, busiest hours and days, and
 * highest-utilization days. 404s on backends that predate the endpoint;
 * getBlobRecords then nulls the leaderboard sections and their cards are
 * omitted rather than replaced by a fallback.
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
 * Historical leaderboards come from GET /records. The entity spend ranking
 * and milestones come from all-time attribution shares (entity-aggregated
 * with share percentages, which the per-address top_spenders list on GET
 * /records cannot provide), and the totals card from /stats.
 *
 * Sources fail independently: a failed endpoint nulls its sections rather
 * than failing the page. Only when every source fails does this throw.
 *
 * @param network - Optional network parameter
 */
export async function getBlobRecords(network?: string): Promise<BlobRecords> {
  const results = await Promise.allSettled([
    getStats(network),
    // All-time range so spend and milestone counters cover each entity's
    // full history. Granularity is pinned to day buckets; only the summary
    // shares are read.
    getAttributionUsageChart('all', network, 'day'),
    getIndexerRecords(network),
  ]);
  const [stats, attribution, records] = results;

  const sources = {
    stats: fulfilledValue(stats),
    attribution: fulfilledValue(attribution),
    records: fulfilledValue(records),
  };

  if (!sources.stats && !sources.attribution && !sources.records) {
    throw firstRejection(results);
  }

  return deriveBlobRecords(sources);
}
