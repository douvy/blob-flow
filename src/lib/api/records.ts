import type { BlobRecords } from '../../types';
import { deriveBlobRecords } from '../records';
import { getAttributionUsageChart } from './charts';
import { getBlobPricing } from './pricing';
import { getStats, getStatsWindows } from './stats';

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
 * The backend has no dedicated records endpoint yet, so this composes the
 * pricing, rolling-window, all-time stats, and attribution endpoints and
 * derives the records client-side (src/lib/records.ts). When a /records
 * endpoint ships, replace this body with a single fetch mapped onto
 * BlobRecords; callers depend only on that shape.
 *
 * Sources fail independently: a failed endpoint nulls its sections rather
 * than failing the page. Only when every source fails does this throw.
 *
 * @param network - Optional network parameter
 */
export async function getBlobRecords(network?: string): Promise<BlobRecords> {
  const results = await Promise.allSettled([
    getBlobPricing(network),
    getStatsWindows(undefined, network),
    getStats(network),
    // All-time range so milestone counters cover each entity's full history.
    // Granularity is pinned to day buckets; only the summary shares are read.
    getAttributionUsageChart('all', network, 'day'),
  ]);
  const [pricing, statsWindows, stats, attribution] = results;

  const sources = {
    pricing: fulfilledValue(pricing),
    statsWindows: fulfilledValue(statsWindows),
    stats: fulfilledValue(stats),
    attribution: fulfilledValue(attribution),
  };

  if (
    !sources.pricing &&
    !sources.statsWindows &&
    !sources.stats &&
    !sources.attribution
  ) {
    throw firstRejection(results);
  }

  return deriveBlobRecords(sources);
}
