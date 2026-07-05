import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { DEFAULT_NETWORK } from '../constants';
import { useNetwork } from '../hooks/useNetwork';
import { api } from '../lib/api';
import SearchModal from './SearchModal';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: { getBlobByTxHash: vi.fn() },
}));

const address = '0x1234567890abcdef1234567890abcdef12345678';
const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

async function openModal() {
  const onClose = vi.fn();
  render(<SearchModal isOpen onClose={onClose} />);
  // The open effect resets the query on the next animation frame; let it run
  // before typing so it doesn't wipe the test's input.
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  return { onClose, input: screen.getByPlaceholderText('Search...') };
}

async function expectSelected(text: string) {
  const item = await screen.findByText(text);
  await waitFor(() =>
    expect(item.closest('[cmdk-item]')).toHaveAttribute('aria-selected', 'true')
  );
  return item;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  // jsdom lacks ResizeObserver (used by cmdk) and scrollIntoView (called on
  // the selected command item).
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
  pushMock.mockReset();
  (useNetwork as Mock).mockReturnValue({
    selectedNetwork: DEFAULT_NETWORK,
    setSelectedNetwork: vi.fn(),
    networkOptions: [DEFAULT_NETWORK],
  });
});

describe('SearchModal', () => {
  it('navigates to the block page when a block number is submitted with Enter', async () => {
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: '25467750' } });
    await expectSelected('Go to block 25,467,750');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith('/block/25467750');
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to the block page for a block: prefixed query', async () => {
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: 'block:25467750' } });
    await expectSelected('Go to block 25,467,750');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith('/block/25467750');
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates to the user page for an address', async () => {
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: address } });
    const item = await screen.findByText(`View blob activity for ${address.slice(0, 6)}...${address.slice(-4)}`);

    fireEvent.click(item);

    expect(pushMock).toHaveBeenCalledWith(`/user/${address}`);
    expect(onClose).toHaveBeenCalled();
  });

  it('resolves a transaction hash to its block', async () => {
    (api.getBlobByTxHash as Mock).mockResolvedValue({
      success: true,
      data: { block_number: 25467700 },
    });
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: txHash } });
    const item = await screen.findByText(
      `Find the block for transaction ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
    );

    fireEvent.click(item);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/block/25467700'));
    expect(api.getBlobByTxHash).toHaveBeenCalledWith(txHash, DEFAULT_NETWORK.apiParam);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error when a transaction hash is not found', async () => {
    (api.getBlobByTxHash as Mock).mockRejectedValue(new Error('HTTP 404'));
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: `tx:${txHash}` } });
    const item = await screen.findByText(
      `Find the block for transaction ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
    );

    fireEvent.click(item);

    await screen.findByText(/No confirmed blob transaction found/);
    expect(pushMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the typed value when switching search type', async () => {
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: '25467750' } });
    fireEvent.click(screen.getByText('Blocks'));

    expect(input).toHaveValue('block:25467750');
  });
});
