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

describe('ChartCardActions', () => {
  beforeEach(() => {
    vi.mocked(copyOrDownloadChartImage).mockReset();
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: NETWORKS.MAINNET,
      setSelectedNetwork: vi.fn(),
      networkOptions: Object.values(NETWORKS),
    });
  });

  it('copies the chart image and shows transient success feedback', async () => {
    vi.mocked(copyOrDownloadChartImage).mockResolvedValue('copied');
    renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Copy chart as image' }));

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
          screen.getByRole('button', { name: 'Copy chart as image' })
        ).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it('reports the download fallback distinctly from a clipboard copy', async () => {
    vi.mocked(copyOrDownloadChartImage).mockResolvedValue('downloaded');
    renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Copy chart as image' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Chart image downloaded' })
      ).toBeInTheDocument()
    );
  });

  it('shows failure feedback when the capture rejects', async () => {
    vi.mocked(copyOrDownloadChartImage).mockRejectedValue(new Error('boom'));
    renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Copy chart as image' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Copying chart image failed' })
      ).toBeInTheDocument()
    );
  });

  it('links the X intent with title, stat, network, and chart deep link', () => {
    renderActions();

    const link = screen.getByRole('link', {
      name: 'Share Blob Usage over 1h view on X',
    });
    const href = new URL(link.getAttribute('href') ?? '');
    expect(href.origin + href.pathname).toBe('https://twitter.com/intent/tweet');
    expect(href.searchParams.get('text')).toBe(
      'Blob Usage over 1h view: 1,234 blobs posted on Mainnet'
    );
    expect(href.searchParams.get('url')).toBe(`${SITE_URL}/charts/blob-usage?range=1h`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('carries the selected network so the card cannot contradict the tweet', () => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: NETWORKS.SEPOLIA,
      setSelectedNetwork: vi.fn(),
      networkOptions: Object.values(NETWORKS),
    });
    renderActions('7d');

    const link = screen.getByRole('link', {
      name: 'Share Blob Usage over 1h view on X',
    });
    const href = new URL(link.getAttribute('href') ?? '');
    const shared = new URL(href.searchParams.get('url') ?? '');

    expect(shared.searchParams.get('network')).toBe('sepolia');
    expect(shared.searchParams.get('range')).toBe('7d');
    expect(href.searchParams.get('text')).toContain('on Sepolia');
  });

  it('leaves the default network out of the link', () => {
    renderActions('24h');

    const link = screen.getByRole('link', {
      name: 'Share Blob Usage over 1h view on X',
    });
    const shared = new URL(
      new URL(link.getAttribute('href') ?? '').searchParams.get('url') ?? ''
    );

    expect(shared.searchParams.get('network')).toBeNull();
  });

  it('shares the range currently selected, not the default', () => {
    renderActions('30d');

    const link = screen.getByRole('link', {
      name: 'Share Blob Usage over 1h view on X',
    });
    const href = new URL(link.getAttribute('href') ?? '');

    // The range rides along so the link opens on the shared view and its
    // unfurled card plots that range.
    expect(href.searchParams.get('url')).toBe(`${SITE_URL}/charts/blob-usage?range=30d`);
  });
});
