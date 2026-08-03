import { api } from '@/lib/api';
import { fetchOgChartSeries, withoutPartialBucket } from './ogChartSeries';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartResponse,
} from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    getBlobMarketChart: vi.fn(),
    getAttributionUsageChart: vi.fn(),
    getCostComparisonChart: vi.fn(),
  },
}));

function marketResponse(
  points: Array<{ fee: string; utilization: string; blobs: number }>
): BackendBlobMarketChartResponse {
  return {
    points: points.map((point, index) => ({
      timestamp: `2026-08-02T0${index}:00:00Z`,
      average_blob_base_fee_gwei: point.fee,
      median_blob_base_fee_gwei: point.fee,
      p95_blob_base_fee_gwei: point.fee,
      blob_count: point.blobs,
      blob_gas_used: 0,
      blob_gas_target: 0,
      average_utilization: point.utilization,
      total_cost_wei: '0',
      unique_senders: 0,
    })),
  } as BackendBlobMarketChartResponse;
}

describe('withoutPartialBucket', () => {
  it('drops the still-filling final bucket once the series is long enough', () => {
    const points = Array.from({ length: 9 }, (_, index) => index);
    expect(withoutPartialBucket(points)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps every point on a short series', () => {
    expect(withoutPartialBucket([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('fetchOgChartSeries', () => {
  beforeEach(() => {
    vi.mocked(api.getBlobMarketChart).mockReset();
    vi.mocked(api.getAttributionUsageChart).mockReset();
    vi.mocked(api.getCostComparisonChart).mockReset();
  });

  it('plots blob base fees and captions them with the window average', async () => {
    vi.mocked(api.getBlobMarketChart).mockResolvedValue(
      marketResponse([
        { fee: '2', utilization: '0.5', blobs: 3 },
        { fee: '4', utilization: '0.3', blobs: 5 },
      ])
    );

    const series = await fetchOgChartSeries('base-fee');

    expect(series?.values).toEqual([2, 4]);
    expect(series?.caption).toBe('avg 3 Gwei over 24h');
    expect(api.getBlobMarketChart).toHaveBeenCalledWith('24h', 'mainnet');
  });

  it('scales the utilization fraction the backend reports into a percentage', async () => {
    vi.mocked(api.getBlobMarketChart).mockResolvedValue(
      marketResponse([
        { fee: '1', utilization: '0.25', blobs: 1 },
        { fee: '1', utilization: '0.75', blobs: 1 },
      ])
    );

    const series = await fetchOgChartSeries('gas-utilization');

    expect(series?.values).toEqual([25, 75]);
    expect(series?.caption).toBe('avg 50.0% of target over 24h');
  });

  it('totals blob counts across attribution series per bucket', async () => {
    vi.mocked(api.getAttributionUsageChart).mockResolvedValue({
      points: [
        {
          timestamp: '2026-08-02T00:00:00Z',
          values: {
            base: { blob_count: 2, total_cost_wei: '0', blob_gas_used: 0 },
            optimism: { blob_count: 3, total_cost_wei: '0', blob_gas_used: 0 },
          },
        },
      ],
    } as unknown as BackendAttributionUsageChartResponse);

    const series = await fetchOgChartSeries('blob-usage');

    expect(series?.values).toEqual([5]);
    expect(series?.caption).toBe('5 blobs over 24h');
  });

  it('requests whichever range the share link carried', async () => {
    vi.mocked(api.getBlobMarketChart).mockResolvedValue(
      marketResponse([{ fee: '5', utilization: '0.5', blobs: 1 }])
    );

    const series = await fetchOgChartSeries('base-fee', '7d');

    expect(api.getBlobMarketChart).toHaveBeenCalledWith('7d', 'mainnet');
    expect(series?.caption).toBe('avg 5 Gwei over 7d');
  });

  it('defaults to a day when the link carried no range', async () => {
    vi.mocked(api.getBlobMarketChart).mockResolvedValue(
      marketResponse([{ fee: '5', utilization: '0.5', blobs: 1 }])
    );

    await fetchOgChartSeries('base-fee');

    expect(api.getBlobMarketChart).toHaveBeenCalledWith('24h', 'mainnet');
  });

  it('falls back to no series for an unknown slug', async () => {
    expect(await fetchOgChartSeries('not-a-chart')).toBeNull();
  });

  it('falls back to no series when the backend fails, leaving the card renderable', async () => {
    vi.mocked(api.getBlobMarketChart).mockRejectedValue(new Error('backend down'));

    expect(await fetchOgChartSeries('base-fee')).toBeNull();
  });
});
