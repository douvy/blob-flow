import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlobTipDataPoint, BlobUsageSeries } from '../../types';
import BlobTipsChart, { toTipPlotRows } from './BlobTipsChart';

const series: BlobUsageSeries[] = [
  { key: 'arbitrum', name: 'Arbitrum', category: 'rollup' },
  { key: 'optimism', name: 'Optimism', category: 'rollup' },
  { key: 'idle', name: 'Idle', category: 'rollup' },
];

function makePoint(timestamp: number, arbitrumBlobs: number): BlobTipDataPoint {
  return {
    timestamp,
    label: `12:0${timestamp}`,
    blobCount: arbitrumBlobs + 2,
    averageGwei: 3,
    medianGwei: 1,
    p95Gwei: 5,
    maxGwei: 5,
    values: {
      arbitrum: { blobCount: arbitrumBlobs, averageGwei: arbitrumBlobs > 0 ? 1 : 0, maxGwei: 1 },
      optimism: { blobCount: 2, averageGwei: 5, maxGwei: 5 },
      idle: { blobCount: 0, averageGwei: 0, maxGwei: 0 },
    },
  };
}

const data = [makePoint(1, 1), makePoint(2, 0), makePoint(3, 2)];

function legendButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('toTipPlotRows', () => {
  it('breaks a series line where the sender posted nothing instead of plotting a zero bid', () => {
    const rows = toTipPlotRows(data, series);

    expect(rows.map((row) => row.values.arbitrum)).toEqual([1, null, 1]);
    expect(rows.map((row) => row.values.optimism)).toEqual([5, 5, 5]);
    expect(rows[0].point).toBe(data[0]);
  });
});

describe('BlobTipsChart', () => {
  it('lists only senders that posted priced blobs in the legend', () => {
    render(<BlobTipsChart data={data} series={series} />);

    expect(legendButton(/Arbitrum/)).toBeInTheDocument();
    expect(legendButton(/Optimism/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Idle/ })).not.toBeInTheDocument();
  });

  it('isolates a series on click and restores all on a second click', async () => {
    const user = userEvent.setup();
    render(<BlobTipsChart data={data} series={series} />);

    await user.click(legendButton(/Optimism/));
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'false');

    await user.click(legendButton(/Optimism/));
    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state without priced series', () => {
    render(<BlobTipsChart data={[]} series={series} />);

    expect(screen.getByText('Tip data unavailable')).toBeInTheDocument();
  });
});
