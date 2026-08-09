import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlobUsageDataPoint, BlobUsageSeries } from '../../types';
import BlobUsageChart, { toShareData } from './BlobUsageChart';

const series: BlobUsageSeries[] = [
  { key: 'arbitrum', name: 'Arbitrum', category: 'rollup' },
  { key: 'base', name: 'Base', category: 'rollup' },
  { key: 'optimism', name: 'Optimism', category: 'rollup' },
];

function makePoint(timestamp: number): BlobUsageDataPoint {
  return {
    timestamp,
    label: `12:0${timestamp}`,
    total: 6,
    arbitrum: 3,
    base: 2,
    optimism: 1,
  };
}

const areaData = [makePoint(1), makePoint(2), makePoint(3), makePoint(4)];

function legendButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('BlobUsageChart legend isolation', () => {
  it('isolates a series on click', async () => {
    const user = userEvent.setup();
    render(<BlobUsageChart data={areaData} series={series} />);

    await user.click(legendButton(/Arbitrum/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores all series when the isolated series is clicked again', async () => {
    const user = userEvent.setup();
    render(<BlobUsageChart data={areaData} series={series} />);

    await user.click(legendButton(/Arbitrum/));
    await user.click(legendButton(/Arbitrum/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches isolation to another series while isolated', async () => {
    const user = userEvent.setup();
    render(<BlobUsageChart data={areaData} series={series} />);

    await user.click(legendButton(/Arbitrum/));
    await user.click(legendButton(/Base/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the remaining series when the isolated series drops out of the data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BlobUsageChart data={areaData} series={series} />);

    await user.click(legendButton(/Arbitrum/));

    const withoutArbitrum = areaData.map((point) => ({ ...point, arbitrum: 0 }));
    rerender(<BlobUsageChart data={withoutArbitrum} series={series} />);

    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('toShareData', () => {
  it('restates each series as a percentage of the bucket total', () => {
    const [point] = toShareData([makePoint(1)], series);

    expect(point.arbitrum).toBeCloseTo(50);
    expect(point.base).toBeCloseTo(100 / 3);
    expect(point.optimism).toBeCloseTo(100 / 6);
  });

  it('keeps the absolute blob count in total so the tooltip can show volume', () => {
    const [point] = toShareData([makePoint(1)], series);

    expect(point.total).toBe(6);
    expect(point.label).toBe('12:01');
    expect(point.timestamp).toBe(1);
  });

  it('shares sum to 100 for every bucket with blobs', () => {
    const varied = [
      { timestamp: 1, label: '12:01', total: 6, arbitrum: 3, base: 2, optimism: 1 },
      { timestamp: 2, label: '12:02', total: 7, arbitrum: 7, base: 0, optimism: 0 },
      { timestamp: 3, label: '12:03', total: 3, arbitrum: 0, base: 1, optimism: 2 },
      { timestamp: 4, label: '12:04', total: 9, arbitrum: 4, base: 4, optimism: 1 },
    ];

    for (const point of toShareData(varied, series)) {
      const sum = series.reduce((total, entry) => total + Number(point[entry.key]), 0);
      expect(sum).toBeCloseTo(100);
    }
  });

  it('reports zero rather than NaN for an empty bucket', () => {
    const empty = { timestamp: 5, label: '12:05', total: 0, arbitrum: 0, base: 0, optimism: 0 };
    const [point] = toShareData([empty], series);

    expect(point.arbitrum).toBe(0);
    expect(point.total).toBe(0);
  });

  // Blobs outside the plotted series still belong in the denominator: the stack
  // should fall short of 100% rather than renormalize the visible series up to
  // it and claim they account for all of the blobspace.
  it('divides by the whole bucket, so unplotted blobs leave the stack short of 100%', () => {
    const withUnplotted = { timestamp: 1, label: '12:01', total: 12, arbitrum: 3, base: 2, optimism: 1 };
    const [point] = toShareData([withUnplotted], series);

    expect(point.arbitrum).toBeCloseTo(25);
    expect(point.total).toBe(12);
    const sum = series.reduce((total, entry) => total + Number(point[entry.key]), 0);
    expect(sum).toBeCloseTo(50);
  });

  it('leaves the source data untouched', () => {
    const source = [makePoint(1)];
    const snapshot = JSON.parse(JSON.stringify(source));

    toShareData(source, series);

    expect(source).toEqual(snapshot);
  });
});

describe('BlobUsageChart share variant', () => {
  it('keeps legend isolation working on shares', async () => {
    const user = userEvent.setup();
    render(<BlobUsageChart data={areaData} series={series} variant="share" />);

    await user.click(legendButton(/Arbitrum/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('drops a series that never holds any share', () => {
    const withoutOptimism = areaData.map((point) => ({ ...point, optimism: 0 }));
    render(<BlobUsageChart data={withoutOptimism} series={series} variant="share" />);

    expect(legendButton(/Arbitrum/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Optimism/ })).not.toBeInTheDocument();
  });
});

describe('BlobUsageChart sparse data', () => {
  // The old pie fallback (data.length <= 3) rendered percentage labels in its
  // legend; the time-series legend never does. Absence of "%" plus the series
  // legend buttons confirms sparse ranges use the area renderer, not a pie.
  it.each([
    ['one bucket', [makePoint(1)]],
    ['two buckets', [makePoint(1), makePoint(2)]],
    ['three buckets', [makePoint(1), makePoint(2), makePoint(3)]],
  ])('renders the time series (never a pie) for %s', (_label, data) => {
    render(<BlobUsageChart data={data} series={series} />);

    expect(legendButton(/Arbitrum/)).toBeInTheDocument();
    expect(legendButton(/Base/)).toBeInTheDocument();
    expect(legendButton(/Optimism/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
