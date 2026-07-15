import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlobUsageDataPoint, BlobUsageSeries } from '../../types';
import BlobUsageChart from './BlobUsageChart';

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
