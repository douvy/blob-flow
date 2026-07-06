import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { DEFAULT_NETWORK } from '../constants';
import { useNetwork } from '../hooks/useNetwork';
import { api } from '../lib/api';
import { ApiError } from '../lib/api/core';
import SearchModal from './SearchModal';

const pushMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  api: { getBlobByTxHash: vi.fn(), getBlobByVersionedHash: vi.fn(), search: vi.fn() },
}));

const address = '0x1234567890abcdef1234567890abcdef12345678';
const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const blobHash = `0x01${'ab'.repeat(31)}`;

// The type-ahead debounce is 250ms; wait past it so /search results (or
// their absence) have settled before asserting.
async function settleTypeAhead() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 320));
  });
}

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
  (api.search as Mock).mockResolvedValue([]);
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
    (api.getBlobByTxHash as Mock).mockRejectedValue(new ApiError(404, 'Not Found'));
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

  it('reports transient lookup failures distinctly from not-found', async () => {
    (api.getBlobByTxHash as Mock).mockRejectedValue(new ApiError(500, 'Internal Server Error'));
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: `tx:${txHash}` } });
    fireEvent.click(
      await screen.findByText(
        `Find the block for transaction ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
      )
    );

    await screen.findByText(/Search failed — the indexer did not respond/);
    expect(screen.queryByText(/No confirmed blob transaction found/)).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('ignores hash lookups that resolve after the query has changed', async () => {
    let resolveLookup: (value: unknown) => void = () => {};
    (api.getBlobByTxHash as Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      })
    );
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: txHash } });
    fireEvent.click(
      await screen.findByText(
        `Find the block for transaction ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
      )
    );

    // The user keeps typing while the lookup is in flight.
    fireEvent.change(input, { target: { value: '25467750' } });
    await act(async () => {
      resolveLookup({ success: true, data: { block_number: 999 } });
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/Search failed/)).not.toBeInTheDocument();
  });

  it('keeps the typed value when switching search type', async () => {
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: '25467750' } });
    fireEvent.click(screen.getByText('Blocks'));

    expect(input).toHaveValue('block:25467750');
  });

  it('moves the highlight to the newly clicked search type instead of Blocks', async () => {
    const { input } = await openModal();

    fireEvent.click(screen.getByText('Blocks'));
    expect(input).toHaveValue('block:');
    await expectSelected('Blocks');

    fireEvent.click(screen.getByText('Rollups'));
    expect(input).toHaveValue('rollup:');

    await expectSelected('Rollups');
    const blocksItem = screen.getByText('Blocks').closest('[cmdk-item]');
    expect(blocksItem).toHaveAttribute('aria-selected', 'false');
    expect(blocksItem).not.toHaveClass('bg-[#23252a]');
    expect(screen.getByText('Rollups').closest('[cmdk-item]')).toHaveClass('bg-[#23252a]');
  });

  it('does not swallow arrow-key selection after clicking Blocks', async () => {
    const { input } = await openModal();

    fireEvent.click(screen.getByText('Blocks'));
    expect(input).toHaveValue('block:');
    await expectSelected('Blocks');

    // cmdk suppresses its automatic re-selection when Blocks is clicked while
    // already selected; a stale redirect flag would send this arrow-key
    // selection back to Blocks.
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    await expectSelected('Blob IDs');
  });

  it('follows a hand-typed prefix with the type highlight and clears it when removed', async () => {
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: 'tx:' } });
    expect(screen.getByText('Transactions with blobs').closest('[cmdk-item]')).toHaveClass(
      'bg-[#23252a]'
    );

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Transactions with blobs').closest('[cmdk-item]')).not.toHaveClass(
      'bg-[#23252a]'
    );
  });

  it('keeps the first match selected when switching type with results showing', async () => {
    (api.search as Mock).mockResolvedValue([
      { type: 'rollup', name: 'Base', addresses: [address] },
    ]);
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: 'base' } });
    await expectSelected('Base');

    fireEvent.click(screen.getByText('Rollups'));
    expect(input).toHaveValue('rollup:base');

    await expectSelected('Base');
  });

  it('resolves a blob versioned hash to its block', async () => {
    (api.getBlobByVersionedHash as Mock).mockResolvedValue({
      tx_hash: txHash,
      block_number: 25467700,
      versioned_hash: blobHash,
    });
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: blobHash } });
    const item = await screen.findByText(
      `Find the block for blob ${blobHash.slice(0, 6)}...${blobHash.slice(-4)}`
    );

    fireEvent.click(item);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/block/25467700'));
    expect(api.getBlobByVersionedHash).toHaveBeenCalledWith(blobHash, DEFAULT_NETWORK.apiParam);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows type-ahead matches and navigates on Enter', async () => {
    (api.search as Mock).mockResolvedValue([
      { type: 'rollup', name: 'Base', addresses: [address] },
    ]);
    const { onClose, input } = await openModal();

    fireEvent.change(input, { target: { value: 'base' } });
    const item = await screen.findByText('Base');
    expect(api.search).toHaveBeenCalledWith('base', DEFAULT_NETWORK.apiParam);

    // With no instant local result, the first navigable match is selected so
    // Enter navigates.
    await waitFor(() =>
      expect(item.closest('[cmdk-item]')).toHaveAttribute('aria-selected', 'true')
    );
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith(`/user/${address}`);
    expect(onClose).toHaveBeenCalled();
  });

  it('drops type-ahead matches that duplicate the instant result', async () => {
    (api.search as Mock).mockResolvedValue([{ type: 'block', block_number: 25467750 }]);
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: '25467750' } });
    await settleTypeAhead();

    expect(screen.getByText('Go to block 25,467,750')).toBeInTheDocument();
    expect(screen.queryByText('Block 25,467,750')).not.toBeInTheDocument();
  });

  it('renders pending matches as disabled', async () => {
    (api.search as Mock).mockResolvedValue([{ type: 'blob', versioned_hash: blobHash, tx_hash: txHash }]);
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: 'blob:0x01ab' } });
    const item = await screen.findByText(
      `Blob ${blobHash.slice(0, 6)}...${blobHash.slice(-4)} — pending`
    );

    expect(item.closest('[cmdk-item]')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('filters type-ahead matches to the active prefix type', async () => {
    (api.search as Mock).mockResolvedValue([
      { type: 'rollup', name: 'Base', addresses: [address] },
      { type: 'address', address, user_attribution: 'Base' },
      { type: 'block', block_number: 42 },
    ]);
    const { input } = await openModal();

    fireEvent.change(input, { target: { value: 'rollup:base' } });
    await screen.findByText('Base');
    expect(api.search).toHaveBeenCalledWith('base', DEFAULT_NETWORK.apiParam);

    expect(screen.queryByText('Block 42')).not.toBeInTheDocument();
    expect(
      screen.getByText(`${address.slice(0, 6)}...${address.slice(-4)} — Base`)
    ).toBeInTheDocument();
  });
});
