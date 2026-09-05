import { fetchOgApi } from '@/lib/og/data';
import { DEFAULT_NETWORK, DEFAULT_TIME_RANGE, NETWORKS } from '@/constants';
import { fetchOgChartSeries, withoutPartialBucket } from './ogChartSeries';
import type {
  BackendAttributionUsageChartResponse,
  BackendBlobMarketChartResponse,
  BackendBlobTipsChartResponse,
} from '@/types';

// The card fetcher, not the client API layer: these reads have to give up
// well before a crawler does, and that timeout lives in lib/og/data.
vi.mock('@/lib/og/data', () => ({
  fetchOgApi: vi.fn(),
}));

function ok<T>(data: T) {
  return { status: 'ok' as const, data };
}

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
    vi.mocked(fetchOgApi).mockReset();
  });

  it('plots blob base fees and captions them with the window average', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok(
        marketResponse([
          { fee: '2', utilization: '0.5', blobs: 3 },
          { fee: '4', utilization: '0.3', blobs: 5 },
        ])
      )
    );

    const series = await fetchOgChartSeries('base-fee', '24h');

    expect(series?.values).toEqual([2, 4]);
    expect(series?.caption).toBe('avg 3 Gwei over 24h');
    expect(fetchOgApi).toHaveBeenCalledWith(
      '/charts/blob-market?range=24h&granularity=auto',
      DEFAULT_NETWORK
    );
  });

  it('scales the utilization fraction the backend reports into a percentage', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok(
        marketResponse([
          { fee: '1', utilization: '0.25', blobs: 1 },
          { fee: '1', utilization: '0.75', blobs: 1 },
        ])
      )
    );

    const series = await fetchOgChartSeries('gas-utilization', '24h');

    expect(series?.values).toEqual([25, 75]);
    expect(series?.caption).toBe('avg 50.0% of target over 24h');
  });

  it('totals blob counts across attribution series per bucket', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok({
        points: [
          {
            timestamp: '2026-08-02T00:00:00Z',
            values: {
              base: { blob_count: 2, total_cost_wei: '0', blob_gas_used: 0 },
              optimism: { blob_count: 3, total_cost_wei: '0', blob_gas_used: 0 },
            },
          },
        ],
      } as unknown as BackendAttributionUsageChartResponse)
    );

    const series = await fetchOgChartSeries('blob-usage', '24h');

    expect(series?.values).toEqual([5]);
    expect(series?.caption).toBe('5 blobs over 24h');
    expect(fetchOgApi).toHaveBeenCalledWith(
      '/charts/attribution-usage?range=24h&granularity=auto',
      DEFAULT_NETWORK
    );
  });

  it('requests whichever range the share link carried', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok(marketResponse([{ fee: '5', utilization: '0.5', blobs: 1 }]))
    );

    const series = await fetchOgChartSeries('base-fee', '7d');

    expect(fetchOgApi).toHaveBeenCalledWith(
      '/charts/blob-market?range=7d&granularity=auto',
      DEFAULT_NETWORK
    );
    expect(series?.caption).toBe('avg 5 Gwei over 7d');
  });

  it('defaults to what the page itself shows when the link carried nothing', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok(marketResponse([{ fee: '5', utilization: '0.5', blobs: 1 }]))
    );

    await fetchOgChartSeries('base-fee');

    // A hand-typed link unfurls the same view it opens on: the app defaults.
    expect(fetchOgApi).toHaveBeenCalledWith(
      `/charts/blob-market?range=${DEFAULT_TIME_RANGE}&granularity=auto`,
      DEFAULT_NETWORK
    );
  });

  it('requests the network a share link carried, not always the default', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok(marketResponse([{ fee: '5', utilization: '0.5', blobs: 1 }]))
    );

    await fetchOgChartSeries('base-fee', '24h', NETWORKS.SEPOLIA);

    expect(fetchOgApi).toHaveBeenCalledWith(
      '/charts/blob-market?range=24h&granularity=auto',
      NETWORKS.SEPOLIA
    );
  });

  it('falls back to no series for an unknown slug without touching the backend', async () => {
    expect(await fetchOgChartSeries('not-a-chart')).toBeNull();
    expect(fetchOgApi).not.toHaveBeenCalled();
  });

  it('falls back to no series when the backend fails, leaving the card renderable', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue({ status: 'unavailable' });

    expect(await fetchOgChartSeries('base-fee')).toBeNull();
  });
});

describe('malformed backend data', () => {
  beforeEach(() => {
    vi.mocked(fetchOgApi).mockReset();
  });

  it('drops points whose metric is missing rather than captioning NaN', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok({
        points: [
          { average_blob_base_fee_gwei: '1' },
          { average_blob_base_fee_gwei: '2', average_utilization: '0.5' },
        ],
      } as unknown as BackendBlobMarketChartResponse)
    );

    const series = await fetchOgChartSeries('gas-utilization', '24h');

    expect(series?.values).toEqual([50]);
    expect(series?.caption).toBe('avg 50.0% of target over 24h');
  });

  it('declines to plot an empty series instead of claiming a zero average', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok({ points: [] } as unknown as BackendBlobMarketChartResponse)
    );

    expect(await fetchOgChartSeries('base-fee', '24h')).toBeNull();
  });

  it('declines when every point is unusable', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      ok({
        points: [
          { average_blob_base_fee_gwei: 'not-a-number' },
          { average_blob_base_fee_gwei: '-1' },
        ],
      } as unknown as BackendBlobMarketChartResponse)
    );

    expect(await fetchOgChartSeries('base-fee', '24h')).toBeNull();
  });
});

describe('blob tip cards', () => {
  beforeEach(() => {
    vi.mocked(fetchOgApi).mockReset();
  });

  function tipsResponse(
    points: Array<{ avg: string; p95: string; blobs: number }>,
    summary: { avg: string; p95: string } = { avg: '1.75', p95: '9' }
  ) {
    return ok({
      points: points.map((point, index) => ({
        timestamp: `2026-08-02T0${index}:00:00Z`,
        blob_count: point.blobs,
        average_priority_fee_gwei: point.avg,
        median_priority_fee_gwei: point.avg,
        p95_priority_fee_gwei: point.p95,
        max_priority_fee_gwei: point.p95,
        values: {},
      })),
      summary: {
        average_priority_fee_gwei: summary.avg,
        p95_priority_fee_gwei: summary.p95,
      },
    } as unknown as BackendBlobTipsChartResponse);
  }

  it('plots average tips and captions them with the blob-weighted range average', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      tipsResponse([
        { avg: '1', p95: '2', blobs: 3 },
        { avg: '3', p95: '9', blobs: 2 },
      ])
    );

    const series = await fetchOgChartSeries('blob-tips', '7d');

    expect(series?.values).toEqual([1, 3]);
    // 1.75 is the backend's mean over blobs, not the 2 a mean of bucket means would give.
    expect(series?.caption).toBe('avg tip 1.75 Gwei over 7d');
    expect(fetchOgApi).toHaveBeenCalledWith(
      '/charts/blob-tips?range=7d&granularity=auto',
      DEFAULT_NETWORK
    );
  });

  it('plots the p95 tip for the spread card', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      tipsResponse([
        { avg: '1', p95: '2', blobs: 3 },
        { avg: '3', p95: '10', blobs: 2 },
      ])
    );

    const series = await fetchOgChartSeries('tip-spread', '24h');

    expect(series?.values).toEqual([2, 10]);
    expect(series?.caption).toBe('p95 tip 9 Gwei over 24h');
  });

  it('declines when the range summary is missing rather than inventing a caption', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      tipsResponse([{ avg: '1', p95: '2', blobs: 3 }], { avg: '', p95: '' })
    );

    expect(await fetchOgChartSeries('blob-tips', '1h')).toBeNull();
  });

  it('skips buckets with no priced blobs rather than plotting zero bids', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(
      tipsResponse([
        { avg: '4', p95: '4', blobs: 1 },
        { avg: '0', p95: '0', blobs: 0 },
      ])
    );

    const series = await fetchOgChartSeries('blob-tips', '1h');

    expect(series?.values).toEqual([4]);
  });

  it('declines to plot a range with no priced blobs', async () => {
    vi.mocked(fetchOgApi).mockResolvedValue(tipsResponse([{ avg: '0', p95: '0', blobs: 0 }]));

    expect(await fetchOgChartSeries('blob-tips', '1h')).toBeNull();
    expect(await fetchOgChartSeries('tip-spread', '1h')).toBeNull();
  });
});
