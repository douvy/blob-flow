import { formatUnits } from 'viem';
import type { TimeRange } from '../contexts/TimeRangeContext';
import type {
  BlobResponse,
  Granularity,
  ChartDataset,
  BaseFeeDataPoint,
  GasUtilizationDataPoint,
  L2UsageDataPoint,
  CostComparisonDataPoint,
  FeeMarketIndicators,
} from '../types';

const TARGET_BLOB_GAS = 393_216; // 3 blobs * 131,072 gas per blob
const DEFAULT_BLOB_GAS = 131_072; // Gas per single blob

function getGranularity(range: TimeRange): Granularity {
  switch (range) {
    case '24h': return 'block';
    case '7d': return 'hourly';
    case '30d':
    case 'All':
      return 'daily';
  }
}

function filterByTimeRange(blobs: BlobResponse[], range: TimeRange): BlobResponse[] {
  if (range === 'All') return blobs;
  const now = Date.now();
  const ms: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - (ms[range] || 0);
  return blobs.filter(b => new Date(b.timestamp).getTime() >= cutoff);
}

function weiToGwei(wei: string): number {
  try {
    return Number(formatUnits(BigInt(wei || '0'), 9));
  } catch {
    return 0;
  }
}

function weiToEth(wei: string): number {
  try {
    return Number(formatUnits(BigInt(wei || '0'), 18));
  } catch {
    return 0;
  }
}

function bucketKey(blob: BlobResponse, granularity: Granularity): string {
  if (granularity === 'block') {
    return blob.block_number.toString();
  }
  const date = new Date(blob.timestamp);
  if (granularity === 'hourly') {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatLabel(blob: BlobResponse, granularity: Granularity): string {
  if (granularity === 'block') {
    return `#${blob.block_number}`;
  }
  const date = new Date(blob.timestamp);
  if (granularity === 'hourly') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function aggregateChartData(
  rawBlobs: BlobResponse[],
  timeRange: TimeRange
): ChartDataset {
  const granularity = getGranularity(timeRange);
  const filtered = filterByTimeRange(rawBlobs, timeRange);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group into buckets preserving insertion order
  const bucketKeys: string[] = [];
  const buckets = new Map<string, BlobResponse[]>();
  for (const blob of sorted) {
    const key = bucketKey(blob, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      bucketKeys.push(key);
    }
    buckets.get(key)!.push(blob);
  }

  const baseFee: BaseFeeDataPoint[] = [];
  const gasUtil: GasUtilizationDataPoint[] = [];
  const l2Usage: L2UsageDataPoint[] = [];
  const costComp: CostComparisonDataPoint[] = [];

  for (const key of bucketKeys) {
    const blobs = buckets.get(key)!;
    const representative = blobs[0];
    const ts = new Date(representative.timestamp).getTime();
    const label = formatLabel(representative, granularity);

    // Base Fee: average within bucket
    const avgBaseFee =
      blobs.reduce((sum, b) => sum + weiToGwei(b.base_fee_per_blob_gas), 0) / blobs.length;
    baseFee.push({
      timestamp: ts,
      label,
      baseFeeGwei: Math.round(avgBaseFee * 1000) / 1000,
      blockNumber: representative.block_number,
    });

    // Gas Utilization
    const totalGas = blobs.reduce((sum, b) => sum + (b.blob_gas_used || DEFAULT_BLOB_GAS), 0);
    gasUtil.push({
      timestamp: ts,
      label,
      blockNumber: representative.block_number,
      blobGasUsed: totalGas,
      targetGas: TARGET_BLOB_GAS,
      blobCount: blobs.length,
      utilizationPct: Math.round((totalGas / TARGET_BLOB_GAS) * 100),
    });

    // L2 Usage
    const attribs = { arbitrum: 0, optimism: 0, base: 0, zksync: 0, unknown: 0 };
    for (const b of blobs) {
      const attr = (b.user_attribution || 'unknown').toLowerCase();
      if (attr in attribs) {
        attribs[attr as keyof typeof attribs]++;
      } else {
        attribs.unknown++;
      }
    }
    l2Usage.push({ timestamp: ts, label, ...attribs, total: blobs.length });

    // Cost Comparison (blob cost vs estimated calldata equivalent)
    const avgBlobCost =
      blobs.reduce((sum, b) => sum + weiToEth(b.total_cost_eth), 0) / blobs.length;
    // Approximate: calldata for 128KB blob costs ~16x more than blob gas
    const avgCalldataCost = avgBlobCost * 16;
    const savings =
      avgCalldataCost > 0
        ? Math.round(((avgCalldataCost - avgBlobCost) / avgCalldataCost) * 100)
        : 0;
    costComp.push({
      timestamp: ts,
      label,
      blobCostEth: avgBlobCost,
      calldataEquivEth: avgCalldataCost,
      savingsPct: savings,
    });
  }

  // Fee market indicators from recent data
  const recentBlobs = sorted.slice(-50);
  const currentBaseFee =
    recentBlobs.length > 0
      ? weiToGwei(recentBlobs[recentBlobs.length - 1].base_fee_per_blob_gas)
      : 0;
  const avgFee =
    recentBlobs.length > 0
      ? recentBlobs.reduce((s, b) => s + weiToGwei(b.base_fee_per_blob_gas), 0) / recentBlobs.length
      : 0;
  const sparkline = baseFee.slice(-12).map(d => d.baseFeeGwei);

  const indicators: FeeMarketIndicators = {
    currentBaseFeeGwei: Math.round(currentBaseFee * 1000) / 1000,
    averageBaseFeeGwei: Math.round(avgFee * 1000) / 1000,
    feeRatio: avgFee > 0 ? Math.round((currentBaseFee / avgFee) * 100) / 100 : 1,
    pendingBlobCount: 0, // Filled from /stats separately
    recentBaseFeeSparkline: sparkline,
  };

  return {
    baseFee,
    gasUtilization: gasUtil,
    l2Usage,
    costComparison: costComp,
    indicators,
    granularity,
  };
}
