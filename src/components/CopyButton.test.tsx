import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CopyButton, { COPY_FEEDBACK_MS } from './CopyButton';

const VALUE = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

function mockClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

describe('CopyButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies the value and reports success', async () => {
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyButton value={VALUE} label="transaction hash" />);

    const button = screen.getByRole('button', { name: 'Copy transaction hash' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith(VALUE);
    expect(screen.getByText('Copied')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('transaction hash copied');
  });

  it('says so when the clipboard rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    render(<CopyButton value={VALUE} label="transaction hash" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy transaction hash' }));
    });

    expect(screen.getByText('Copy failed')).toBeInTheDocument();
  });

  it('returns to its resting label after the feedback window', async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    render(<CopyButton value={VALUE} label="transaction hash" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy transaction hash' }));
    });
    expect(screen.getByText('Copied')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MS);
    });

    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders icon only in compact form, keeping an accessible name', async () => {
    mockClipboard(() => Promise.resolve());
    render(<CopyButton compact value={VALUE} label="blob #0 versioned hash" />);

    const button = screen.getByRole('button', { name: 'Copy blob #0 versioned hash' });
    expect(button).toHaveTextContent('');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('status')).toHaveTextContent('blob #0 versioned hash copied');
  });
});
