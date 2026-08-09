import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NETWORKS, SITE_URL, type TimeRange } from '@/constants';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { useNetwork } from '@/hooks/useNetwork';
import { copyOrDownloadChartImage } from '@/lib/chartExport';
import ChartCardActions from './ChartCardActions';

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/lib/chartExport', () => ({
  copyOrDownloadChartImage: vi.fn(),
}));

const captureNode = document.createElement('div');
const captureRef = { current: captureNode };

function renderActions(timeRange: TimeRange = '1h') {
  return render(
    <TimeRangeProvider initialRange={timeRange}>
      <ChartCardActions
        chartId="blob-usage"
        chartTitle="Blob Usage over 1h view"
        headlineStat="1,234 blobs posted"
        rangeLabel="1h view"
        captureRef={captureRef}
      />
    </TimeRangeProvider>
  );
}

/** Renders, opens the share menu, and returns the item named. */
async function openMenuItem(name: string, timeRange: TimeRange = '1h') {
  renderActions(timeRange);
  await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));
  return screen.getByRole('menuitem', { name });
}

describe('ChartCardActions', () => {
  beforeEach(() => {
    vi.mocked(copyOrDownloadChartImage).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: NETWORKS.MAINNET,
      setSelectedNetwork: vi.fn(),
      networkOptions: Object.values(NETWORKS),
    });
  });

  describe('the menu', () => {
    it('keeps the actions behind one trigger until it is opened', async () => {
      renderActions();

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    });

    it('moves focus into the menu on open, so the keyboard path is not a tab hunt', async () => {
      renderActions();

      await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));

      expect(screen.getByRole('menuitem', { name: 'Copy as image' })).toHaveFocus();
    });

    it('cycles the items with the arrow keys', async () => {
      renderActions();
      await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));

      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('menuitem', { name: 'Share on X' })).toHaveFocus();

      // Wraps rather than dead-ending at either edge.
      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(screen.getByRole('menuitem', { name: 'Share on Farcaster' })).toHaveFocus();
    });

    it('closes on Escape and hands focus back to the trigger', async () => {
      renderActions();
      await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Share chart' })).toHaveFocus();
    });

    it('closes on a click outside', async () => {
      renderActions();
      await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));

      await userEvent.click(document.body);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes once an item is chosen', async () => {
      const item = await openMenuItem('Share on X');

      await userEvent.click(item);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('analytics', () => {
    const track = vi.fn();

    beforeEach(() => {
      track.mockReset();
      window.umami = { track };
    });

    afterEach(() => {
      delete window.umami;
    });

    it('reports the export outcome, telling a download from a copy', async () => {
      vi.mocked(copyOrDownloadChartImage).mockResolvedValue('downloaded');

      await userEvent.click(await openMenuItem('Copy as image'));

      await waitFor(() =>
        expect(track).toHaveBeenCalledWith('chart-image', {
          chart: 'blob-usage',
          outcome: 'downloaded',
        })
      );
    });

    it('reports a failed export', async () => {
      vi.mocked(copyOrDownloadChartImage).mockRejectedValue(new Error('no canvas'));

      await userEvent.click(await openMenuItem('Copy as image'));

      await waitFor(() =>
        expect(track).toHaveBeenCalledWith('chart-image', {
          chart: 'blob-usage',
          outcome: 'error',
        })
      );
    });

    it('reports the share with the network and range it was shared from', async () => {
      await userEvent.click(await openMenuItem('Share on X', '7d'));

      expect(track).toHaveBeenCalledWith('chart-share-x', {
        chart: 'blob-usage',
        network: NETWORKS.MAINNET.apiParam,
        range: '7d',
      });
    });

    it('reports a Farcaster share separately from an X share', async () => {
      await userEvent.click(await openMenuItem('Share on Farcaster', '7d'));

      expect(track).toHaveBeenCalledWith('chart-share-farcaster', {
        chart: 'blob-usage',
        network: NETWORKS.MAINNET.apiParam,
        range: '7d',
      });
      expect(track).not.toHaveBeenCalledWith('chart-share-x', expect.anything());
    });
  });

  describe('copying the chart image', () => {
    it('copies and reports the outcome on the trigger, which outlives the menu', async () => {
      vi.mocked(copyOrDownloadChartImage).mockResolvedValue('copied');

      await userEvent.click(await openMenuItem('Copy as image'));

      expect(copyOrDownloadChartImage).toHaveBeenCalledTimes(1);
      const [node, meta, fileName] = vi.mocked(copyOrDownloadChartImage).mock.calls[0];
      expect(node).toBe(captureNode);
      expect(meta.title).toBe('Blob Usage over 1h view');
      expect(meta.networkName).toBe(NETWORKS.MAINNET.name);
      expect(meta.rangeLabel).toBe('1h view');
      expect(fileName).toMatch(/^blob-flow-blob-usage-over-1h-view-\d{8}-\d{4}\.png$/);

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Chart image copied to clipboard' })
        ).toBeInTheDocument()
      );

      // Feedback resets back to the idle affordance after the timeout elapses.
      await waitFor(
        () =>
          expect(
            screen.getByRole('button', { name: 'Share chart' })
          ).toBeInTheDocument(),
        { timeout: 3000 }
      );
    });

    it('reports the download fallback distinctly from a clipboard copy', async () => {
      vi.mocked(copyOrDownloadChartImage).mockResolvedValue('downloaded');

      await userEvent.click(await openMenuItem('Copy as image'));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Chart image downloaded' })
        ).toBeInTheDocument()
      );
    });

    it('shows failure feedback when the capture rejects', async () => {
      vi.mocked(copyOrDownloadChartImage).mockRejectedValue(new Error('boom'));

      await userEvent.click(await openMenuItem('Copy as image'));

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Copying chart image failed' })
        ).toBeInTheDocument()
      );
    });
  });

  it('links the X intent with title, stat, and chart deep link', async () => {
    const link = await openMenuItem('Share on X');

    const href = new URL(link.getAttribute('href') ?? '');
    expect(href.origin + href.pathname).toBe('https://twitter.com/intent/tweet');
    expect(href.searchParams.get('text')).toBe(
      'Blob Usage over 1h view: 1,234 blobs posted on Mainnet'
    );
    expect(href.searchParams.get('url')).toBe(`${SITE_URL}/charts/blob-usage?range=1h`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('links the Farcaster composer with the same copy and an embedded deep link', async () => {
    const link = await openMenuItem('Share on Farcaster');

    const href = new URL(link.getAttribute('href') ?? '');
    expect(href.origin + href.pathname).toBe('https://farcaster.xyz/~/compose');
    expect(href.searchParams.get('text')).toBe(
      'Blob Usage over 1h view: 1,234 blobs posted on Mainnet'
    );
    expect(href.searchParams.get('embeds[]')).toBe(
      `${SITE_URL}/charts/blob-usage?range=1h`
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('carries the selected network into both share links', async () => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: NETWORKS.SEPOLIA,
      setSelectedNetwork: vi.fn(),
      networkOptions: Object.values(NETWORKS),
    });
    renderActions('7d');

    await userEvent.click(screen.getByRole('button', { name: 'Share chart' }));
    const tweet = new URL(
      screen.getByRole('menuitem', { name: 'Share on X' }).getAttribute('href') ?? ''
    );
    const cast = new URL(
      screen.getByRole('menuitem', { name: 'Share on Farcaster' }).getAttribute('href') ??
        ''
    );

    // Network travels in the path, matching every other in-app link.
    for (const shared of [
      new URL(tweet.searchParams.get('url') ?? ''),
      new URL(cast.searchParams.get('embeds[]') ?? ''),
    ]) {
      expect(shared.pathname).toBe('/sepolia/charts/blob-usage');
      expect(shared.searchParams.get('range')).toBe('7d');
    }
    expect(tweet.searchParams.get('text')).toContain('on Sepolia');
    expect(cast.searchParams.get('text')).toContain('on Sepolia');
  });

  it('leaves the default network out of the link', async () => {
    const link = await openMenuItem('Share on X', '24h');
    const shared = new URL(
      new URL(link.getAttribute('href') ?? '').searchParams.get('url') ?? ''
    );

    expect(shared.pathname).toBe('/charts/blob-usage');
  });

  it('shares the range currently selected, not the default', async () => {
    const link = await openMenuItem('Share on X', '30d');

    // The range rides along so the link opens on the shared view and its
    // unfurled card plots that range.
    expect(new URL(link.getAttribute('href') ?? '').searchParams.get('url')).toBe(
      `${SITE_URL}/charts/blob-usage?range=30d`
    );
  });
});
