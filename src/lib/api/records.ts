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
 * highest-utilization days.
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

/**
 * Assemble blob market records for the /records page.
 *
 * Historical leaderboards come from GET /records. The entity spend ranking
 * and milestones come from all-time attribution shares (entity-aggregated
 * with share percentages, which the per-address top_spenders list on GET
 * /records cannot provide), and the totals card from /stats.
 *
 * @param network - Optional network parameter
 */
export async function getBlobRecords(network?: string): Promise<BlobRecords> {
  const [stats, attribution, records] = await Promise.all([
    getStats(network),
    // All-time range so spend and milestone counters cover each entity's
    // full history. Granularity is pinned to day buckets; only the summary
    // shares are read.
    getAttributionUsageChart('all', network, 'day'),
    getIndexerRecords(network),
  ]);

  return deriveBlobRecords({ stats, attribution, records });
}
