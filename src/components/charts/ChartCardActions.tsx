"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Camera, Check, Download, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { copyOrDownloadChartImage } from '@/lib/chartExport';
import { SITE_URL } from '@/constants';
import { buildTweetIntentUrl, chartImageFileName, networkPath } from '@/utils';
import { useNetwork } from '@/hooks/useNetwork';
import { useTimeRange } from '@/contexts/TimeRangeContext';

type CopyState = 'idle' | 'busy' | 'copied' | 'downloaded' | 'error';

const FEEDBACK_RESET_MS = 2000;

const CHART_ACTION_BUTTON_BASE =
  'flex flex-none items-center justify-center rounded-md border border-divider bg-[#1d1f23] text-blue transition-colors hover:bg-[#252936] hover:text-lightBlue focus:outline-none focus:ring-2 focus:ring-blue/60 disabled:pointer-events-none disabled:opacity-60';

const COPY_STATE_LABELS: Record<CopyState, string> = {
  idle: 'Copy chart as image',
  busy: 'Rendering chart image',
  copied: 'Chart image copied to clipboard',
  downloaded: 'Chart image downloaded',
  error: 'Copying chart image failed',
};

function CopyStateIcon({ state, iconClass }: { state: CopyState; iconClass: string }) {
  switch (state) {
    case 'busy':
      return <Loader2 className={`${iconClass} animate-spin`} aria-hidden="true" />;
    case 'copied':
      return <Check className={`${iconClass} text-green`} aria-hidden="true" />;
    case 'downloaded':
      return <Download className={`${iconClass} text-green`} aria-hidden="true" />;
    case 'error':
      return <AlertTriangle className={`${iconClass} text-red`} aria-hidden="true" />;
    default:
      return <Camera className={iconClass} aria-hidden="true" />;
  }
}

function XLogoIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

interface ChartCardActionsProps {
  chartId: string;
  chartTitle: string;
  headlineStat: string | null;
  rangeLabel: string;
  /** The chart body node to capture; the branded frame supplies the title. */
  captureRef: React.RefObject<HTMLElement | null>;
  /** Button footprint, so a denser header (the hero) can size them down. */
  sizeClass?: string;
  iconClass?: string;
}

/**
 * Per-card share actions: copy the chart as a branded PNG (with a download
 * fallback when the image Clipboard API is unavailable) and share on X.
 */
export default function ChartCardActions({
  chartId,
  chartTitle,
  headlineStat,
  rangeLabel,
  captureRef,
  sizeClass = 'h-8 w-8',
  iconClass = 'h-4 w-4',
}: ChartCardActionsProps) {
  const { selectedNetwork } = useNetwork();
  const { timeRange } = useTimeRange();
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const buttonClass = `${CHART_ACTION_BUTTON_BASE} ${sizeClass}`;

  useEffect(() => {
    if (copyState === 'idle' || copyState === 'busy') return;
    const timer = window.setTimeout(() => setCopyState('idle'), FEEDBACK_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  // Deliberately not async: navigator.clipboard.write must be reached
  // synchronously from the click for Safari to honor the user activation.
  const handleCopy = () => {
    const node = captureRef.current;
    if (!node || copyState === 'busy') return;
    setCopyState('busy');
    const capturedAt = new Date();
    const meta = {
      title: chartTitle,
      networkName: selectedNetwork.name,
      rangeLabel,
      capturedAt,
    };
    copyOrDownloadChartImage(node, meta, chartImageFileName(chartTitle, capturedAt))
      .then((outcome) => {
        setCopyState(outcome);
        // The clipboard and download paths are worth telling apart: a chart
        // that mostly downloads is being shared by people whose browser has
        // no image clipboard.
        trackEvent('chart-image', { chart: chartId, outcome });
      })
      .catch(() => {
        setCopyState('error');
        trackEvent('chart-image', { chart: chartId, outcome: 'error' });
      });
  };

  // Range and network ride along so the link opens on the view the sharer
  // saw, and so its unfurled card plots that data. Network travels in the
  // path, the way every other in-app link carries it; without it the card
  // would show mainnet while the tweet text named another chain.
  const sharePath = networkPath(
    `/charts/${chartId}?range=${timeRange}`,
    selectedNetwork.apiParam
  );
  const tweetUrl = buildTweetIntentUrl({
    title: chartTitle,
    stat: headlineStat ? `${headlineStat} on ${selectedNetwork.name}` : null,
    url: `${SITE_URL}${sharePath}`,
  });

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={copyState === 'busy'}
        className={buttonClass}
        aria-label={COPY_STATE_LABELS[copyState]}
        title="Copy chart as image"
      >
        <CopyStateIcon state={copyState} iconClass={iconClass} />
      </button>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent('chart-share-x', {
            chart: chartId,
            network: selectedNetwork.apiParam,
            range: timeRange,
          })
        }
        className={buttonClass}
        aria-label={`Share ${chartTitle} on X`}
        title="Share on X"
      >
        <XLogoIcon className={iconClass === 'h-4 w-4' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      </a>
    </>
  );
}
