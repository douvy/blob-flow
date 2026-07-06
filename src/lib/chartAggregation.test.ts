import {
  buildChartDataset,
  buildChartDatasetFromResponses,
  describeBucketSpan,
  getBucketLabelStyle,
  getChartDataCoverage,
  getPricingBlockRequestLimit,
  getRequestedRollingWindow,
  marketPointHasData,
  selectRollingWindow,
  transformStatsWindows,
} from './chartAggregation';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartPoint,
  BackendBlobMarketChartResponse,
  BackendCostComparisonChartResponse,
  BackendStatsWindow,
  BackendStatsWindowsResponse,
  BlobPricing,
  NetworkStats,
  RollingWindowKey,
} from '../types';

function makeWindow(
  window: RollingWindowKey,
  durationSeconds: number,
  overrides: Partial<BackendStatsWindow> = {}
): BackendStatsWindow {
  return {
    window,
    duration_seconds: durationSeconds,
    start_time: '2026-01-01T00:00:00.000Z',
    end_time: '2026-01-02T00:00:00.000Z',
    average_blob_base_fee: '1500000000',
    median_blob_base_fee: '1000000000',
    p95_blob_base_fee: '2500000000',
    total_blobs: 100,
    total_blob_gas_used: 13107200,
    average_utilization: '0.5',
    total_cost_eth: '1000000000000000000',
    unique_senders: 12,
    ...overrides,
  };
}

function makeStatsWindows(windows: BackendStatsWindow[]): BackendStatsWindowsResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    generated_at: '2026-01-02T00:00:00.000Z',
    windows,
  };
}

const stats: NetworkStats = {
  averageBaseFee: '1 Gwei',
  totalBlobs: 1000,
  totalConfirmedBlobs: 900,
  pendingBlobsCount: 3,
  avgBlobsPerBlock: 1.2,
  averageTip: '0 Wei',
  averageTotalCost: '0 Wei',
  lastIndexedBlock: 101,
  lastIndexedTime: '2026-01-02T00:00:00.000Z',
};

const pricing: BlobPricing = {
  networkId: 1,
  networkName: 'mainnet',
  currentBaseFee: '4 Gwei',
  currentBaseFeeGwei: '4',
  currentExcessGas: 0,
  currentUtilization: 1.142857,
  predictedNextFee: '3.9 Gwei',
  predictedNextFeeGwei: '3.9',
  forkStage: 'BPO2',
  blobParams: {
    target: 14,
    max: 21,
    updateFraction: 11684671,
    targetGas: 1835008,
    maxGas: 2752512,
  },
  marketPressure: {
    recentBlocksAboveTarget: 1,
    consecutiveFullBlocks: 0,
    percentRecentBlocksAtMaxBlobs: 0,
    predictedDirection: 'down',
    nextBlockFeeEstimate: {
      low: '3.5 Gwei',
      high: '4.5 Gwei',
    },
  },
  recentBlocks: [
    {
      blockNumber: 2,
      blockTimestamp: '2026-01-01T00:00:24.000Z',
      blobCount: 16,
      blobGasUsed: 2097152,
      blobGasTarget: 1835008,
      blobGasLimit: 2752512,
      excessBlobGas: 0,
      blobBaseFee: '4 Gwei',
      blobBaseFeeGwei: '4',
      utilizationRatio: 1.142857,
      targetBlobs: 14,
      maxBlobs: 21,
      availableBlobs: 5,
      utilizationPercent: 76.19,
      isFull: false,
      isAboveTarget: true,
    },
    {
      blockNumber: 1,
      blockTimestamp: '2026-01-01T00:00:12.000Z',
      blobCount: 7,
      blobGasUsed: 917504,
      blobGasTarget: 1835008,
      blobGasLimit: 2752512,
      excessBlobGas: 0,
      blobBaseFee: '2 Gwei',
      blobBaseFeeGwei: '2',
      utilizationRatio: 0.5,
      targetBlobs: 14,
      maxBlobs: 21,
      availableBlobs: 14,
      utilizationPercent: 33.33,
      isFull: false,
      isAboveTarget: false,
    },
  ],
};

describe('chartAggregation', () => {
  it('maps range selection to rolling stats windows', () => {
    expect(getRequestedRollingWindow('24h')).toBe('24h');
    expect(getRequestedRollingWindow('7d')).toBe('7d');
    expect(getRequestedRollingWindow('30d')).toBe('30d');
    expect(getRequestedRollingWindow('All')).toBe('30d');
    // The pricing API serves at most 300 blocks per request, enough for the
    // full 1h live view; longer ranges clamp to that cap.
    expect(getPricingBlockRequestLimit('1h')).toBe(300);
    expect(getPricingBlockRequestLimit('24h')).toBe(300);

    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('5m', 300),
      makeWindow('7d', 604800),
    ]));

    expect(selectRollingWindow(windows, 'All')?.window).toBe('7d');
  });

  it('transforms rolling stats values into display units', () => {
    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('24h', 86400, {
        average_blob_base_fee: '1500000000.5',
        median_blob_base_fee: '900000000',
        p95_blob_base_fee: '2500000000',
        average_utilization: '0.42123',
      }),
      makeWindow('1h', 3600, {
        total_cost_eth: '0.001',
      }),
    ]));

    expect(windows.find((window) => window.window === '24h')).toMatchObject({
      window: '24h',
      averageBaseFeeGwei: 1.5,
      medianBaseFeeGwei: 0.9,
      p95BaseFeeGwei: 2.5,
      averageUtilizationPct: 42.12,
      totalCostEth: 1,
    });
    expect(windows.find((window) => window.window === '1h')).toMatchObject({
      totalCostEth: 0.001,
    });
  });

  it('passes block counts through and drops malformed values', () => {
    const windows = transformStatsWindows(makeStatsWindows([
      makeWindow('24h', 86400, { total_blocks: 7200, blocks_above_target: 4812 }),
      makeWindow('1h', 3600, { total_blocks: Number.NaN, blocks_above_target: -1 }),
      makeWindow('5m', 300),
    ]));

    expect(windows.find((window) => window.window === '24h')).toMatchObject({
      totalBlocks: 7200,
      blocksAboveTarget: 4812,
    });

    const hourWindow = windows.find((window) => window.window === '1h');
    expect(hourWindow?.totalBlocks).toBeUndefined();
    expect(hourWindow?.blocksAboveTarget).toBeUndefined();

    const fiveMinuteWindow = windows.find((window) => window.window === '5m');
    expect(fiveMinuteWindow?.totalBlocks).toBeUndefined();
    expect(fiveMinuteWindow?.blocksAboveTarget).toBeUndefined();
  });

  it('builds chart data from pricing blocks and selected rolling stats', () => {
    const dataset = buildChartDataset(
      makeStatsWindows([
        makeWindow('24h', 86400, { total_blobs: 24 }),
        makeWindow('7d', 604800, { total_blobs: 700 }),
        makeWindow('30d', 2592000, { total_blobs: 3000 }),
      ]),
      pricing,
      'All',
      stats
    );

    expect(dataset.selectedWindow?.window).toBe('30d');
    expect(dataset.rollingCoverageLabel).toContain('All view uses the 30d');
    expect(dataset.baseFee.map((point) => point.blockNumber)).toEqual([1, 2]);
    expect(dataset.gasUtilization[1]).toMatchObject({
      blockNumber: 2,
      blobGasUsed: 2097152,
      targetGas: 1835008,
      maxGas: 2752512,
      blobCount: 16,
      utilizationPct: 114,
    });
    expect(dataset.indicators).toMatchObject({
      currentBaseFeeGwei: 4,
      averageBaseFeeGwei: 1.5,
      feeRatio: 2.67,
      pendingBlobCount: 3,
    });
    expect(dataset.coverageLabel).toContain('latest 2 pricing blocks');
  });

  it('treats only all-zero market buckets as missing data', () => {
    const makePoint = (
      overrides: Partial<BackendBlobMarketChartPoint>
    ): BackendBlobMarketChartPoint => ({
      timestamp: '2026-01-01T00:00:00.000Z',
      average_blob_base_fee_gwei: '0',
      median_blob_base_fee_gwei: '0',
      p95_blob_base_fee_gwei: '0',
      blob_count: 0,
      blob_gas_used: 0,
      blob_gas_target: 1835008,
      average_utilization: '0',
      total_cost_wei: '0',
      unique_senders: 0,
      ...overrides,
    });

    // No indexed blocks: every observed field is zero.
    expect(marketPointHasData(makePoint({}))).toBe(false);
    expect(marketPointHasData(makePoint({ average_blob_base_fee_gwei: 'not-a-number' }))).toBe(false);

    // Real buckets survive, including blocks with zero blobs (fee still set)
    // and buckets at the 1 wei protocol floor.
    expect(marketPointHasData(makePoint({ blob_count: 3, blob_gas_used: 393216 }))).toBe(true);
    expect(marketPointHasData(makePoint({ average_blob_base_fee_gwei: '0.004' }))).toBe(true);
    expect(marketPointHasData(makePoint({ average_blob_base_fee_gwei: '0.000000001' }))).toBe(true);
  });

  it('filters pricing chart series to the selected rolling window', () => {
    const windowedPricing: BlobPricing = {
      ...pricing,
      recentBlocks: [
        {
          ...pricing.recentBlocks[0],
          blockNumber: 3,
          blockTimestamp: '2025-12-31T23:59:59.000Z',
          blobBaseFeeGwei: '9',
        },
        {
          ...pricing.recentBlocks[1],
          blockNumber: 4,
          blockTimestamp: '2026-01-01T00:30:00.000Z',
          blobBaseFeeGwei: '2',
        },
      ],
    };

    const dataset = buildChartDataset(
      makeStatsWindows([
        makeWindow('1h', 3600, {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-01T01:00:00.000Z',
        }),
      ]),
      windowedPricing,
      '1h',
      stats
    );

    expect(dataset.baseFee.map((point) => point.blockNumber)).toEqual([4]);
    expect(dataset.gasUtilization.map((point) => point.blockNumber)).toEqual([4]);
    expect(dataset.recentBlockCount).toBe(1);
    expect(dataset.chartRangeLabel).toBe('1h view');
    expect(dataset.blockCoverageLabel).toContain('within the 1h view');
  });
});

function makeMarketPoint(
  timestamp: string,
  overrides: Partial<BackendBlobMarketChartPoint> = {}
): BackendBlobMarketChartPoint {
  return {
    timestamp,
    average_blob_base_fee_gwei: '0.005',
    median_blob_base_fee_gwei: '0.005',
    p95_blob_base_fee_gwei: '0.006',
    blob_count: 10,
    blob_gas_used: 1310720,
    blob_gas_target: 1835008,
    average_utilization: '0.5',
    total_cost_wei: '0',
    unique_senders: 3,
    ...overrides,
  };
}

function makeEmptyMarketPoint(timestamp: string): BackendBlobMarketChartPoint {
  return makeMarketPoint(timestamp, {
    average_blob_base_fee_gwei: '0',
    median_blob_base_fee_gwei: '0',
    p95_blob_base_fee_gwei: '0',
    blob_count: 0,
    blob_gas_used: 0,
    average_utilization: '0',
    unique_senders: 0,
  });
}

function makeMarketResponse(
  overrides: Partial<BackendBlobMarketChartResponse> = {}
): BackendBlobMarketChartResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '30d',
    granularity: 'hour',
    bucket_seconds: 21600,
    start_time: '2026-06-06T06:00:00Z',
    end_time: '2026-07-06T06:00:00Z',
    generated_at: '2026-07-06T06:00:00Z',
    points: [],
    summary: {
      current_base_fee_gwei: '0.005',
      average_blob_base_fee_gwei: '0.005',
      median_blob_base_fee_gwei: '0.005',
      p95_blob_base_fee_gwei: '0.006',
      total_blobs: 100,
      total_blob_gas_used: 13107200,
      average_utilization: '0.5',
      total_cost_wei: '0',
      unique_senders: 5,
    },
    ...overrides,
  };
}

function makeAttributionResponse(
  timestamps: string[],
  overrides: Partial<BackendAttributionUsageChartResponse> = {}
): BackendAttributionUsageChartResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '30d',
    granularity: 'hour',
    bucket_seconds: 21600,
    start_time: '2026-06-06T06:00:00Z',
    end_time: '2026-07-06T06:00:00Z',
    generated_at: '2026-07-06T06:00:00Z',
    series: [{ key: 'arbitrum', name: 'Arbitrum', category: 'rollup' }],
    points: timestamps.map((timestamp) => ({
      timestamp,
      values: { arbitrum: { blob_count: 2, total_cost_wei: '0', blob_gas_used: 262144 } },
    })),
    summary: { total_blobs: 0, total_cost_wei: '0', shares: [] },
    ...overrides,
  };
}

function makeCostResponse(
  timestamps: string[],
  overrides: Partial<BackendCostComparisonChartResponse> = {}
): BackendCostComparisonChartResponse {
  return {
    network_id: 1,
    network_name: 'mainnet',
    range: '30d',
    granularity: 'hour',
    bucket_seconds: 21600,
    start_time: '2026-06-06T06:00:00Z',
    end_time: '2026-07-06T06:00:00Z',
    generated_at: '2026-07-06T06:00:00Z',
    model: { calldata_gas_per_byte: 16, blob_size_bytes: 131072, description: '' },
    points: timestamps.map((timestamp) => ({
      timestamp,
      blob_count: 2,
      blob_bytes: 262144,
      blob_cost_wei: '1000000000000000',
      calldata_equivalent_cost_wei: '9000000000000000',
      savings_wei: '8000000000000000',
      savings_percent: 88.9,
    })),
    summary: {
      blob_cost_wei: '0',
      calldata_equivalent_cost_wei: '0',
      savings_wei: '0',
      savings_percent: 0,
    },
    ...overrides,
  };
}

describe('describeBucketSpan', () => {
  it('names common bucket widths', () => {
    expect(describeBucketSpan(86400)).toBe('daily');
    expect(describeBucketSpan(3600)).toBe('hourly');
    expect(describeBucketSpan(60)).toBe('minute');
  });

  it('names multiples of days, hours, and minutes', () => {
    expect(describeBucketSpan(172800)).toBe('2-day');
    expect(describeBucketSpan(21600)).toBe('6-hour');
    expect(describeBucketSpan(300)).toBe('5-minute');
    expect(describeBucketSpan(90)).toBe('90-second');
  });

  it('rejects missing or non-positive widths', () => {
    expect(describeBucketSpan(0)).toBeNull();
    expect(describeBucketSpan(-3600)).toBeNull();
    expect(describeBucketSpan(Number.NaN)).toBeNull();
  });
});

describe('getBucketLabelStyle', () => {
  const DAY_MS = 86_400_000;

  it('labels day-wide buckets by date only', () => {
    expect(getBucketLabelStyle(86400, 30 * DAY_MS)).toBe('day');
  });

  it('adds the date to sub-day buckets once data spans more than a day', () => {
    expect(getBucketLabelStyle(21600, 30 * 3_600_000)).toBe('day-time');
    expect(getBucketLabelStyle(21600, 30 * DAY_MS)).toBe('day-time');
  });

  it('keeps time-only labels within a single day of data', () => {
    expect(getBucketLabelStyle(300, DAY_MS)).toBe('time');
    expect(getBucketLabelStyle(300, 0)).toBe('time');
  });
});

describe('getChartDataCoverage', () => {
  const response = { start_time: '2026-06-06T06:00:00Z', bucket_seconds: 21600 };

  it('reports full coverage when data reaches the requested start', () => {
    const coverage = getChartDataCoverage(response, [
      { timestamp: '2026-06-06T06:00:00Z' },
      { timestamp: '2026-06-06T12:00:00Z' },
    ]);

    expect(coverage).toEqual({
      startMs: Date.parse('2026-06-06T06:00:00Z'),
      endMs: Date.parse('2026-06-06T18:00:00Z'),
      spanMs: 12 * 3_600_000,
      isPartial: false,
    });
  });

  it('tolerates a single missing leading bucket', () => {
    const coverage = getChartDataCoverage(response, [
      { timestamp: '2026-06-06T12:00:00Z' },
    ]);

    expect(coverage?.isPartial).toBe(false);
  });

  it('flags backfill gaps at the start of the requested range', () => {
    const coverage = getChartDataCoverage(response, [
      { timestamp: '2026-07-05T00:00:00Z' },
      { timestamp: '2026-07-06T00:00:00Z' },
    ]);

    expect(coverage?.isPartial).toBe(true);
    expect(coverage?.spanMs).toBe(30 * 3_600_000);
  });

  it('returns null without parseable data points', () => {
    expect(getChartDataCoverage(response, [])).toBeNull();
    expect(getChartDataCoverage(response, [{ timestamp: 'not-a-date' }])).toBeNull();
  });
});

describe('buildChartDatasetFromResponses during a backfill', () => {
  // Mirrors a real backfilling indexer: a 30d request answered with 6-hour
  // buckets where only the last ~30 hours contain data.
  const dataTimestamps = [
    '2026-07-05T00:00:00Z',
    '2026-07-05T06:00:00Z',
    '2026-07-05T12:00:00Z',
    '2026-07-05T18:00:00Z',
    '2026-07-06T00:00:00Z',
  ];
  const market = makeMarketResponse({
    points: [
      makeEmptyMarketPoint('2026-06-06T06:00:00Z'),
      makeEmptyMarketPoint('2026-06-06T12:00:00Z'),
      ...dataTimestamps.map((timestamp) => makeMarketPoint(timestamp)),
    ],
  });

  it('labels sub-day buckets with the date once data spans more than a day', () => {
    const dataset = buildChartDatasetFromResponses(
      market,
      makeAttributionResponse(dataTimestamps),
      makeCostResponse(dataTimestamps),
      '30d'
    );

    expect(dataset.baseFee.map((point) => point.label)).toEqual([
      '7/5 00:00',
      '7/5 06:00',
      '7/5 12:00',
      '7/5 18:00',
      '7/6 00:00',
    ]);
    expect(dataset.gasUtilization[0].label).toBe('7/5 00:00');
  });

  it('drops attribution and cost buckets that predate the indexed coverage', () => {
    const dataset = buildChartDatasetFromResponses(
      market,
      makeAttributionResponse(['2026-06-06T06:00:00Z', '2026-07-04T18:00:00Z', ...dataTimestamps]),
      makeCostResponse(['2026-06-06T06:00:00Z', ...dataTimestamps]),
      '30d'
    );

    expect(dataset.l2Usage.map((point) => point.label)).toEqual([
      '7/5 00:00',
      '7/5 06:00',
      '7/5 12:00',
      '7/5 18:00',
      '7/6 00:00',
    ]);
    expect(dataset.costComparison).toHaveLength(dataTimestamps.length);
    expect(dataset.costComparison[0].label).toBe('7/5 00:00');
  });

  it('describes the real bucket width and where indexed data starts', () => {
    const dataset = buildChartDatasetFromResponses(
      market,
      makeAttributionResponse(dataTimestamps),
      makeCostResponse(dataTimestamps),
      '30d'
    );

    expect(dataset.blockCoverageLabel).toBe(
      '5 6-hour buckets over the 30d view (indexed data starts 7/5 00:00 UTC)'
    );
  });

  it('keeps plain labels and captions when coverage is complete', () => {
    const fullTimestamps = Array.from({ length: 4 }, (_, index) => {
      const day = 6 + index;
      return `2026-06-0${day}T00:00:00Z`;
    });
    const fullMarket = makeMarketResponse({
      bucket_seconds: 86400,
      granularity: 'day',
      start_time: '2026-06-06T00:00:00Z',
      points: fullTimestamps.map((timestamp) => makeMarketPoint(timestamp)),
    });

    const dataset = buildChartDatasetFromResponses(
      fullMarket,
      makeAttributionResponse(fullTimestamps, { bucket_seconds: 86400, granularity: 'day' }),
      makeCostResponse(fullTimestamps, { bucket_seconds: 86400, granularity: 'day' }),
      '30d'
    );

    expect(dataset.baseFee.map((point) => point.label)).toEqual(['6/6', '6/7', '6/8', '6/9']);
    expect(dataset.l2Usage).toHaveLength(4);
    expect(dataset.blockCoverageLabel).toBe('4 daily buckets over the 30d view');
  });
});
