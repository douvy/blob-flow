import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CostComparisonDataPoint } from '../../types';
import CostComparisonChart from './CostComparisonChart';

const data: CostComparisonDataPoint[] = [
  { timestamp: 1, label: '12:00', blobCostEth: 0.001, calldataEquivEth: 0.02, savingsPct: 95 },
  { timestamp: 2, label: '12:01', blobCostEth: 0.002, calldataEquivEth: 0.03, savingsPct: 93 },
];

function legendButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('CostComparisonChart legend isolation', () => {
  it('shows both series and the savings summary by default', () => {
    render(<CostComparisonChart data={data} />);

    expect(legendButton(/Blob Cost/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Calldata/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('~94% savings')).toBeInTheDocument();
  });

  it('isolates a series on click and hides the savings summary', async () => {
    const user = userEvent.setup();
    render(<CostComparisonChart data={data} />);

    await user.click(legendButton(/Blob Cost/));

    expect(legendButton(/Blob Cost/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Calldata/)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('~94% savings')).not.toBeInTheDocument();
  });

  it('switches isolation to the other series', async () => {
    const user = userEvent.setup();
    render(<CostComparisonChart data={data} />);

    await user.click(legendButton(/Blob Cost/));
    await user.click(legendButton(/Calldata/));

    expect(legendButton(/Blob Cost/)).toHaveAttribute('aria-pressed', 'false');
    expect(legendButton(/Calldata/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('~94% savings')).not.toBeInTheDocument();
  });

  it('restores both series when the isolated series is clicked again', async () => {
    const user = userEvent.setup();
    render(<CostComparisonChart data={data} />);

    await user.click(legendButton(/Blob Cost/));
    await user.click(legendButton(/Blob Cost/));

    expect(legendButton(/Blob Cost/)).toHaveAttribute('aria-pressed', 'true');
    expect(legendButton(/Calldata/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('~94% savings')).toBeInTheDocument();
  });
});
