import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { L2UsageDataPoint, L2UsageSeries } from '../../types';
import L2UsageChart from './L2UsageChart';

const series: L2UsageSeries[] = [
  { key: 'arbitrum', name: 'Arbitrum', category: 'rollup' },
  { key: 'base', name: 'Base', category: 'rollup' },
  { key: 'optimism', name: 'Optimism', category: 'rollup' },
];

function makePoint(timestamp: number): L2UsageDataPoint {
  return {
    timestamp,
    label: `12:0${timestamp}`,
    total: 6,
    arbitrum: 3,
    base: 2,
    optimism: 1,
  };
}

const pieData = [makePoint(1), makePoint(2)];
const areaData = [makePoint(1), makePoint(2), makePoint(3), makePoint(4)];

function legendButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('L2UsageChart legend isolation', () => {
  it('isolates a series on click and shows it at 100% of the pie', async () => {
    const user = userEvent.setup();
    render(<L2UsageChart data={pieData} series={series} />);

    await user.click(legendButton(/Arbitrum/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Arbitrum/)).toHaveTextContent('100%');
  });

  it('restores all series when the isolated series is clicked again', async () => {
    const user = userEvent.setup();
    render(<L2UsageChart data={pieData} series={series} />);

    await user.click(legendButton(/Arbitrum/));
    await user.click(legendButton(/Arbitrum/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches isolation to another series while isolated', async () => {
    const user = userEvent.setup();
    render(<L2UsageChart data={pieData} series={series} />);

    await user.click(legendButton(/Arbitrum/));
    await user.click(legendButton(/Base/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the remaining series when the isolated series drops out of the data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<L2UsageChart data={pieData} series={series} />);

    await user.click(legendButton(/Arbitrum/));

    const withoutArbitrum = pieData.map((point) => ({ ...point, arbitrum: 0 }));
    rerender(<L2UsageChart data={withoutArbitrum} series={series} />);

    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('No series selected')).not.toBeInTheDocument();
  });

  it('isolates and restores in the area chart legend too', async () => {
    const user = userEvent.setup();
    render(<L2UsageChart data={areaData} series={series} />);

    await user.click(legendButton(/Base/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Base/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'false');

    await user.click(legendButton(/Base/));

    expect(legendButton(/Arbitrum/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Optimism/)).toHaveAttribute('aria-pressed', 'true');
  });
});
