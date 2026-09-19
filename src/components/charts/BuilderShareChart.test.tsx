import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BackendBuilderShareChartResponse } from '@/types';
import BuilderShareChart, { toBuilderShareData } from './BuilderShareChart';

/** Hour buckets inside a single day, so labels stay hour:minute. */
function makeResponse(
  overrides: Partial<BackendBuilderShareChartResponse> = {}
): BackendBuilderShareChartResponse {
  return {
    chain_id: 1,
    network_name: 'mainnet',
    range: '24h',
    granularity: 'hour',
    bucket_seconds: 3600,
    start_time: '2026-01-01T00:00:00Z',
    end_time: '2026-01-01T02:00:00Z',
    generated_at: '2026-01-01T02:00:05Z',
    series: [
      { key: 'titan', name: 'Titan Builder', known: true },
      { key: 'beaver', name: 'beaverbuild', known: true },
      { key: 'other', name: 'Other', known: false },
    ],
    points: [
      {
        timestamp: '2026-01-01T00:00:00Z',
        blocks: 100,
        blobs: 200,
        values: {
          titan: { blocks: 50, blobs: 120 },
          beaver: { blocks: 30, blobs: 60 },
          other: { blocks: 20, blobs: 20 },
        },
      },
      {
        timestamp: '2026-01-01T01:00:00Z',
        blocks: 200,
        blobs: 400,
        values: {
          titan: { blocks: 120, blobs: 240 },
          beaver: { blocks: 60, blobs: 120 },
          other: { blocks: 20, blobs: 40 },
        },
      },
    ],
    summary: {
      total_blocks: 300,
      total_blobs: 600,
      shares: [],
    },
    ...overrides,
  };
}

function legendButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('toBuilderShareData', () => {
  it('plots the raw counts for the requested metric', () => {
    const rows = toBuilderShareData(makeResponse(), 'blocks', 'count');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ total: 100, titan: 50, beaver: 30, other: 20 });
    expect(rows[1]).toMatchObject({ total: 200, titan: 120, beaver: 60, other: 20 });
  });

  it('reads the other metric off the same buckets', () => {
    const rows = toBuilderShareData(makeResponse(), 'blobs', 'count');

    expect(rows[0]).toMatchObject({ total: 200, titan: 120, beaver: 60, other: 20 });
  });

  it('divides by the bucket total for the share variant', () => {
    const rows = toBuilderShareData(makeResponse(), 'blocks', 'share');

    expect(rows[0]).toMatchObject({ total: 100, titan: 50, beaver: 30, other: 20 });
    expect(rows[1]).toMatchObject({ total: 200, titan: 60, beaver: 30, other: 10 });
  });

  it('leaves an empty bucket at zero rather than dividing by it', () => {
    const data = makeResponse();
    data.points[0].blocks = 0;
    data.points[0].values.titan.blocks = 0;
    data.points[0].values.beaver.blocks = 0;
    data.points[0].values.other.blocks = 0;

    const rows = toBuilderShareData(data, 'blocks', 'share');

    expect(rows[0]).toMatchObject({ total: 0, titan: 0, beaver: 0, other: 0 });
  });

  it('zero-fills a series the bucket has no value for', () => {
    const data = makeResponse();
    delete data.points[0].values.beaver;

    expect(toBuilderShareData(data, 'blocks', 'count')[0].beaver).toBe(0);
  });

  it('labels sub-day buckets with the local time', () => {
    // Tests run at TZ=Asia/Tokyo (UTC+9), so midnight UTC is 09:00 local.
    const rows = toBuilderShareData(makeResponse(), 'blocks', 'count');

    expect(rows[0].label).toBe('09:00');
    expect(rows[1].label).toBe('10:00');
  });

  it('labels day buckets with the local month and day', () => {
    const rows = toBuilderShareData(
      makeResponse({
        granularity: 'day',
        bucket_seconds: 86_400,
        points: [
          {
            timestamp: '2026-01-01T00:00:00Z',
            blocks: 10,
            blobs: 20,
            values: { titan: { blocks: 10, blobs: 20 } },
          },
        ],
      }),
      'blocks',
      'count'
    );

    expect(rows[0].label).toBe('1/1');
  });

  it('adds the date to sub-day buckets once the data spans more than a day', () => {
    const rows = toBuilderShareData(
      makeResponse({
        points: [
          {
            timestamp: '2026-01-01T00:00:00Z',
            blocks: 10,
            blobs: 20,
            values: { titan: { blocks: 10, blobs: 20 } },
          },
          {
            timestamp: '2026-01-03T00:00:00Z',
            blocks: 10,
            blobs: 20,
            values: { titan: { blocks: 10, blobs: 20 } },
          },
        ],
      }),
      'blocks',
      'count'
    );

    expect(rows[0].label).toBe('1/1 09:00');
    expect(rows[1].label).toBe('1/3 09:00');
  });
});

describe('BuilderShareChart', () => {
  it('lists every series that has data in the legend', () => {
    render(<BuilderShareChart data={makeResponse()} metric="blocks" variant="count" />);

    expect(legendButton(/Titan Builder/)).toBeInTheDocument();
    expect(legendButton(/beaverbuild/)).toBeInTheDocument();
    expect(legendButton(/Other/)).toBeInTheDocument();
  });

  it('isolates a series on click and restores it on a second click', async () => {
    const user = userEvent.setup();
    render(<BuilderShareChart data={makeResponse()} metric="blocks" variant="count" />);

    await user.click(legendButton(/Titan Builder/));

    expect(legendButton(/Titan Builder/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/beaverbuild/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Other/)).toHaveAttribute('aria-pressed', 'false');

    await user.click(legendButton(/Titan Builder/));

    expect(legendButton(/beaverbuild/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Other/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches isolation to another series while isolated', async () => {
    const user = userEvent.setup();
    render(<BuilderShareChart data={makeResponse()} metric="blocks" variant="count" />);

    await user.click(legendButton(/Titan Builder/));
    await user.click(legendButton(/beaverbuild/));

    expect(legendButton(/beaverbuild/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Titan Builder/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows an empty state when the window has no buckets', () => {
    render(
      <BuilderShareChart data={makeResponse({ points: [] })} metric="blocks" variant="count" />
    );

    expect(screen.getByText('No builder share data for this window.')).toBeInTheDocument();
  });

  it('shows an empty state when every series is idle', () => {
    render(
      <BuilderShareChart
        data={makeResponse({
          points: [
            {
              timestamp: '2026-01-01T00:00:00Z',
              blocks: 0,
              blobs: 0,
              values: {
                titan: { blocks: 0, blobs: 0 },
                beaver: { blocks: 0, blobs: 0 },
                other: { blocks: 0, blobs: 0 },
              },
            },
          ],
        })}
        metric="blocks"
        variant="count"
      />
    );

    expect(screen.getByText('No builder share data for this window.')).toBeInTheDocument();
  });
});
