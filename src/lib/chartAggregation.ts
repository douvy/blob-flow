import { formatUnits } from 'viem';
import type { TimeRange } from '../contexts/TimeRangeContext';
import type {
  BackendStatsWindowsResponse,
  BaseFeeDataPoint,
  BlobPricing,
  ChartDataset,
  GasUtilizationDataPoint,
  NetworkStats,
  RollingWindowDataPoint,
  RollingWindowKey,
} from '../types';

const WINDOW_LABELS: Record<RollingWindowKey, string> = {
  '5m': '5m',
  '1h': '1h',
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
};

const WINDOW_FALLBACK_ORDER: RollingWindowKey[] = ['30d', '7d', '24h', '1h', '5m'];

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseFiniteNumber(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimalWeiToGwei(value: string | undefined): number {
  return roundTo(parseFiniteNumber(value) / 1e9, 6);
}

function weiToEth(value: string | undefined): number {
  if (!value) return 0;

  const normalized = value.trim();
  if (normalized.includes('.')) {
    return parseFiniteNumber(normalized);
  }

  if (/^\d+$/.test(normalized)) {
    return Number(formatUnits(BigInt(normalized), 18));
  }

  return 0;
}

function isoTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatWindowLabel(window: string): string {
  if (window in WINDOW_LABELS) {
    return WINDOW_LABELS[window as RollingWindowKey];
  }
  return window;
}

function getCurrentBaseFeeGwei(pricing: BlobPricing, baseFee: BaseFeeDataPoint[]): number {
  const current = parseFiniteNumber(pricing.currentBaseFeeGwei);
  if (current > 0) return roundTo(current, 6);

  const latest = baseFee[baseFee.length - 1];
  return latest?.baseFeeGwei ?? 0;
}

function formatBlockCoverage(recentBlockCount: number): string {
  if (recentBlockCount === 0) return 'no recent pricing blocks';
  if (recentBlockCount === 1) return 'latest 1 pricing block';
  return `latest ${recentBlockCount.toLocaleString()} pricing blocks`;
}

function formatRollingCoverage(timeRange: TimeRange, selectedWindow: RollingWindowDataPoint | null): string {
  if (!selectedWindow) return 'rolling stats unavailable';

  if (timeRange === 'All') {
    return `All view uses the ${selectedWindow.label} rolling API window`;
  }

  if (selectedWindow.window !== timeRange) {
    return `${timeRange} view uses the ${selectedWindow.label} rolling API window`;
  }

  return `${selectedWindow.label} rolling API window`;
}

export function getRequestedRollingWindow(timeRange: TimeRange): RollingWindowKey {
  if (timeRange === 'All') return '30d';
  return timeRange;
}

export function transformStatsWindows(
  statsWindows: BackendStatsWindowsResponse
): RollingWindowDataPoint[] {
  return statsWindows.windows
    .map((window) => ({
      window: window.window,
      label: formatWindowLabel(window.window),
      durationSeconds: window.duration_seconds,
      startTimestamp: isoTimestamp(window.start_time),
      endTimestamp: isoTimestamp(window.end_time),
      averageBaseFeeGwei: decimalWeiToGwei(window.average_blob_base_fee),
      medianBaseFeeGwei: decimalWeiToGwei(window.median_blob_base_fee),
      p95BaseFeeGwei: decimalWeiToGwei(window.p95_blob_base_fee),
      totalBlobs: window.total_blobs,
      totalBlobGasUsed: window.total_blob_gas_used,
      averageUtilizationPct: roundTo(parseFiniteNumber(window.average_utilization) * 100, 2),
      totalCostEth: weiToEth(window.total_cost_eth),
      uniqueSenders: window.unique_senders,
    }))
    .sort((a, b) => a.durationSeconds - b.durationSeconds);
}

export function selectRollingWindow(
  windows: RollingWindowDataPoint[],
  timeRange: TimeRange
): RollingWindowDataPoint | null {
  const requestedWindow = getRequestedRollingWindow(timeRange);
  const exactMatch = windows.find((window) => window.window === requestedWindow);
  if (exactMatch) return exactMatch;

  for (const fallback of WINDOW_FALLBACK_ORDER) {
    const fallbackMatch = windows.find((window) => window.window === fallback);
    if (fallbackMatch) return fallbackMatch;
  }

  return windows[windows.length - 1] ?? null;
}

export function transformPricingBlocks(pricing: BlobPricing): {
  baseFee: BaseFeeDataPoint[];
  gasUtilization: GasUtilizationDataPoint[];
} {
  const sortedBlocks = [...pricing.recentBlocks].sort((a, b) => {
    const timestampDiff = isoTimestamp(a.blockTimestamp) - isoTimestamp(b.blockTimestamp);
    return timestampDiff !== 0 ? timestampDiff : a.blockNumber - b.blockNumber;
  });

  const baseFee = sortedBlocks.map((block) => ({
    timestamp: isoTimestamp(block.blockTimestamp),
    label: `#${block.blockNumber}`,
    baseFeeGwei: roundTo(parseFiniteNumber(block.blobBaseFeeGwei), 6),
    blockNumber: block.blockNumber,
  }));

  const gasUtilization = sortedBlocks.map((block) => {
    const targetGas = block.blobGasTarget || pricing.blobParams.targetGas;
    const utilizationPct =
      targetGas > 0
        ? roundTo((block.blobGasUsed / targetGas) * 100, 0)
        : roundTo(block.utilizationRatio * 100, 0);

    return {
      timestamp: isoTimestamp(block.blockTimestamp),
      label: `#${block.blockNumber}`,
      blockNumber: block.blockNumber,
      blobGasUsed: block.blobGasUsed,
      targetGas,
      blobCount: block.blobCount,
      utilizationPct,
    };
  });

  return { baseFee, gasUtilization };
}

export function buildChartDataset(
  statsWindows: BackendStatsWindowsResponse,
  pricing: BlobPricing,
  timeRange: TimeRange,
  stats?: NetworkStats
): ChartDataset {
  const rollingWindows = transformStatsWindows(statsWindows);
  const selectedWindow = selectRollingWindow(rollingWindows, timeRange);
  const { baseFee, gasUtilization } = transformPricingBlocks(pricing);
  const currentBaseFeeGwei = getCurrentBaseFeeGwei(pricing, baseFee);
  const averageBaseFeeGwei =
    selectedWindow?.averageBaseFeeGwei ??
    (baseFee.length > 0
      ? baseFee.reduce((sum, point) => sum + point.baseFeeGwei, 0) / baseFee.length
      : 0);
  const rollingCoverageLabel = formatRollingCoverage(timeRange, selectedWindow);
  const blockCoverageLabel = formatBlockCoverage(pricing.recentBlocks.length);

  return {
    baseFee,
    gasUtilization,
    l2Usage: [],
    costComparison: [],
    rollingWindows,
    selectedWindow,
    indicators: {
      currentBaseFeeGwei,
      averageBaseFeeGwei: roundTo(averageBaseFeeGwei, 6),
      feeRatio:
        averageBaseFeeGwei > 0
          ? roundTo(currentBaseFeeGwei / averageBaseFeeGwei, 2)
          : 1,
      pendingBlobCount: stats?.pendingBlobsCount ?? 0,
      recentBaseFeeSparkline: baseFee.slice(-12).map((point) => point.baseFeeGwei),
    },
    granularity: 'block',
    recentBlockCount: pricing.recentBlocks.length,
    rollingCoverageLabel,
    blockCoverageLabel,
    coverageLabel: `${rollingCoverageLabel}; fee and utilization charts show the ${blockCoverageLabel}.`,
  };
}
