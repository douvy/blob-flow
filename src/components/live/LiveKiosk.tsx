"use client";

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, MoveRight } from 'lucide-react';
import { api } from '@/lib/api';
import { transformPricingRecentBlock } from '@/lib/api/pricing';
import {
  computeFeeRangeTrend,
  formatFeeNumber,
  formatSignedPercent,
  mergeRecentPricingBlocks,
  parseGwei,
  trimBlocksToWindow,
} from '@/lib/blobFeeHero';
import {
  KIOSK_FOCUS_PARAM,
  KIOSK_PRICING_BLOCKS,
  KIOSK_ROLLUP_FETCH,
  KIOSK_TICKER_BLOCKS,
  KIOSK_TOP_ROLLUPS,
  buildChartPoints,
  buildFocusTickerSlots,
  parseKioskFocus,
  buildRollupBars,
  buildTickerSlots,
  describeKioskConnection,
  getBlockAgeSeconds,
  getFeeDirection,
  getFeeExtremes,
  getFullness,
  getPredictedDirection,
  summarizeKioskMempool,
  type KioskFeeDirection,
  type KioskFocus,
} from '@/lib/liveKiosk';
import {
  aggregateMempoolAttribution,
  countLikelyIncludable,
} from '@/lib/mempoolAttribution';
import { useApiData } from '@/hooks/useApiData';
import { useLatestBlobBaseFee } from '@/hooks/useLatestBlobBaseFee';
import { useLiveBlockList } from '@/hooks/useLiveBlockList';
import { useMempoolLiveList } from '@/hooks/useMempoolLiveList';
import { useNetwork } from '@/hooks/useNetwork';
import { useNow } from '@/hooks/useNow';
import { useTopUsers } from '@/hooks/useTopUsers';
import { useBlobWebSocket, useLiveBlobEvent } from '@/contexts/LiveDataContext';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import NetworkLink from '@/components/NetworkLink';
import { MEMPOOL_SAMPLE_LIMIT } from '@/constants';
import type { BlobPricing, BlobPricingRecentBlock } from '@/types';
import { formatPercent } from '@/utils';
import KioskBlockTicker from './KioskBlockTicker';
import KioskControls from './KioskControls';
import KioskFeeChart from './KioskFeeChart';
import KioskFullnessGauge from './KioskFullnessGauge';
import KioskMempoolPanel from './KioskMempoolPanel';
import { KioskPanelSkeleton } from './KioskSkeleton';
import KioskTopRollups from './KioskTopRollups';

/** REST fallback cadence. The websocket drives the display between refreshes. */
const KIOSK_REFRESH_MS = 30_000;

const ROLLUP_WINDOW = '1h' as const;

const DIRECTION_ICONS: Record<KioskFeeDirection, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: MoveRight,
};

const DIRECTION_TEXT: Record<KioskFeeDirection, string> = {
  up: 'text-red',
  down: 'text-green',
  flat: 'text-[#a9adb6]',
};

const DIRECTION_LABEL: Record<KioskFeeDirection, string> = {
  up: 'rising',
  down: 'falling',
  flat: 'holding steady',
};

/** Panel shell. Every panel shares one border and radius so the wall reads as a grid. */
function Panel({
  children,
  className = '',
  pulseKey,
}: {
  children: React.ReactNode;
  className?: string;
  /** Changes once per block to re-run the edge flash. */
  pulseKey?: number;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-divider bg-[#141519] ${className}`}
    >
      {pulseKey !== undefined && pulseKey > 0 && (
        <span
          key={pulseKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl border animate-[kiosk-block-flash_900ms_ease-out_forwards] motion-reduce:animate-none"
        />
      )}
      {children}
    </section>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="truncate text-[clamp(0.65rem,min(0.9vw,1.6vh),1rem)] font-medium uppercase tracking-[0.2em] text-[#6e7687]">
      {children}
    </h2>
  );
}

/**
 * The focused target inside an uppercase panel label. Addresses opt out of
 * the transform: "0X485F…9BFF" is harder to read than the hex as written,
 * and the leading "0X" looks like a typo.
 */
export function FocusLabel({ focus }: { focus: KioskFocus }) {
  if (focus.kind === 'address') {
    return <span className="font-mono normal-case tracking-normal">{focus.label}</span>;
  }
  return <>{focus.label}</>;
}

/**
 * Full-screen display view for conference screens, stream overlays, and
 * screenshots. Read-only apart from the auto-hiding network switcher.
 *
 * Everything on screen is driven by the websocket once loaded: the REST
 * queries only seed the first paint and act as a slow fallback if the stream
 * goes quiet. Because values are held in component state rather than cleared
 * on disconnect, a dropped socket leaves the last known market on screen and
 * flags itself in the status strip instead of blanking the wall.
 */
export default function LiveKiosk() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const { connectionState } = useBlobWebSocket();
  const queryClient = useQueryClient();
  // Focused rollup or sender address, from the URL so a kiosk can be pinned
  // to one L2 (or one poster) permanently.
  const searchParams = useSearchParams();
  const rawFocus = searchParams.get(KIOSK_FOCUS_PARAM);
  const focus = useMemo(() => parseKioskFocus(rawFocus), [rawFocus]);

  const fetchPricing = useCallback(
    () => api.getBlobPricing(network, KIOSK_PRICING_BLOCKS),
    [network]
  );
  const {
    data: pricing,
    isLoading,
    error,
  } = useApiData<BlobPricing>(
    fetchPricing,
    ['blob-pricing-kiosk', network, KIOSK_PRICING_BLOCKS],
    { refetchInterval: KIOSK_REFRESH_MS }
  );

  // Head state (prediction, market pressure) refreshed per block. Shares the
  // cache entry the hero uses, so the two never disagree about the head.
  const fetchPricingHead = useCallback(() => api.getBlobPricing(network), [network]);
  const { data: pricingHead, refetch: refetchPricingHead } = useApiData<BlobPricing>(
    fetchPricingHead,
    ['blob-pricing-head', network],
    { refetchInterval: KIOSK_REFRESH_MS }
  );

  const [liveState, setLiveState] = useState<{
    network: string;
    blocks: BlobPricingRecentBlock[];
  }>({ network, blocks: [] });

  const foldLiveBlocks = useCallback(
    (incoming: BlobPricingRecentBlock[]) => {
      if (incoming.length === 0) return;
      setLiveState((currentState) => ({
        network,
        blocks: mergeRecentPricingBlocks(
          incoming,
          currentState.network === network ? currentState.blocks : [],
          KIOSK_PRICING_BLOCKS
        ),
      }));
    },
    [network]
  );

  useLiveBlobEvent('new_block', (event) => {
    const record = event.data.pricing;
    if (record) {
      foldLiveBlocks([transformPricingRecentBlock(record)]);
    }
    void refetchPricingHead();
    // The backend only broadcasts users_update for the all-time window, so
    // the 1h rollup shares would otherwise sit frozen at their initial
    // fetch. Refetch per block; the payload is a handful of rows. The limit
    // must match the useTopUsers call below, since it is part of the key.
    void queryClient.invalidateQueries({
      queryKey: ['top-users', network, KIOSK_ROLLUP_FETCH, ROLLUP_WINDOW],
    });
  });

  // Sent on every (re)connect: replaces the blocks broadcast while this
  // display was offline, so the ticker heals without waiting for a refetch.
  useLiveBlobEvent('block_snapshot', (event) => {
    foldLiveBlocks(
      event.data.blocks.map((blockData) => transformPricingRecentBlock(blockData.pricing))
    );
  });

  const blocks = useMemo(
    () =>
      mergeRecentPricingBlocks(
        pricing?.recentBlocks ?? [],
        liveState.network === network ? liveState.blocks : [],
        KIOSK_PRICING_BLOCKS
      ),
    [pricing, liveState, network]
  );

  const headlinePricing = pricingHead ?? pricing;
  const headBlock = blocks[0];

  const currentFeeGwei = headBlock
    ? parseGwei(headBlock.blobBaseFeeGwei)
    : parseGwei(headlinePricing?.currentBaseFeeGwei);
  const previousFeeGwei = blocks[1] ? parseGwei(blocks[1].blobBaseFeeGwei) : null;
  const feeDirection = getFeeDirection(currentFeeGwei, previousFeeGwei);

  const predictedFeeGwei = parseGwei(headlinePricing?.predictedNextFeeGwei);
  const predictedDirection = getPredictedDirection(
    predictedFeeGwei,
    currentFeeGwei,
    headlinePricing?.marketPressure.predictedDirection
  );

  const fullness = getFullness(headBlock);

  // Focus mode reads full block records (the pricing feed carries no
  // attribution); the list is folded from the same new_block/block_snapshot
  // events, so both ticker variants stay in step with the headline.
  const { blocks: detailBlocks } = useLiveBlockList(KIOSK_TICKER_BLOCKS);
  const tickerSlots = useMemo(
    () =>
      focus
        ? buildFocusTickerSlots(detailBlocks, focus, KIOSK_TICKER_BLOCKS)
        : buildTickerSlots(blocks, KIOSK_TICKER_BLOCKS),
    [focus, detailBlocks, blocks]
  );
  const newestTickerKey = focus
    ? (detailBlocks[0]?.number ?? null)
    : headBlock
      ? headBlock.blockNumber.toString()
      : null;

  // Trend chart over the advertised hour. Missed slots stretch 300 blocks
  // past an hour of wall time, so trim to the window before plotting.
  const chartPoints = useMemo(() => buildChartPoints(trimBlocksToWindow(blocks)), [blocks]);
  const feeExtremes = useMemo(() => getFeeExtremes(chartPoints), [chartPoints]);
  const rangeTrend = useMemo(
    () => computeFeeRangeTrend(chartPoints.map((point) => point.fee)),
    [chartPoints]
  );
  const trendDirection: KioskFeeDirection =
    rangeTrend?.direction === 'up' ? 'up' : rangeTrend?.direction === 'down' ? 'down' : 'flat';

  // Fetched deeper than it renders so unattributed senders can be filtered
  // out without thinning the list below KIOSK_TOP_ROLLUPS.
  const { data: topUsers, error: topUsersError } = useTopUsers(
    KIOSK_ROLLUP_FETCH,
    network,
    ROLLUP_WINDOW
  );
  const rollups = useMemo(
    () =>
      buildRollupBars(
        topUsers?.data,
        KIOSK_TOP_ROLLUPS,
        focus,
        topUsers?.hasServerShares ?? true
      ),
    [topUsers, focus]
  );

  // Pending demand. Shares the mempool and pricing-head cache entries with the
  // homepage hero and /mempool, so the kiosk adds no extra requests and can
  // never disagree with those surfaces. In focus mode only the focused
  // rollup's pending blobs are counted.
  const {
    transactions: mempoolTransactions,
    truncated: mempoolTruncated,
    error: mempoolError,
  } = useMempoolLiveList(MEMPOOL_SAMPLE_LIMIT, network);
  const latestBlobBaseFeeWei = useLatestBlobBaseFee(network);
  const mempool = useMemo(() => {
    if (!mempoolTransactions) {
      return null;
    }
    const scopedTransactions = focus
      ? mempoolTransactions.filter((tx) =>
          focus.kind === 'address'
            ? tx.fromAddressFull.toLowerCase() === focus.value
            : tx.user === focus.value
        )
      : mempoolTransactions;
    return summarizeKioskMempool(
      aggregateMempoolAttribution(scopedTransactions),
      countLikelyIncludable(scopedTransactions, latestBlobBaseFeeWei),
      mempoolTruncated,
      headBlock?.maxBlobs ?? headlinePricing?.blobParams.max ?? 0
    );
  }, [
    mempoolTransactions,
    focus,
    mempoolTruncated,
    latestBlobBaseFeeWei,
    headBlock,
    headlinePricing,
  ]);

  const connection = describeKioskConnection(connectionState);
  const now = useNow();
  const blockAgeSeconds = getBlockAgeSeconds(headBlock?.blockTimestamp, now);
  const pulseKey = headBlock?.blockNumber ?? 0;

  // The websocket alone is enough to run the wall. Gating the whole view on
  // the REST query would hide a healthy stream behind a skeleton (and then an
  // error screen) whenever /blob/pricing is slow or down.
  const hasRenderableData = Boolean(pricing) || blocks.length > 0;

  const FeeDirectionIcon = DIRECTION_ICONS[feeDirection];
  const PredictedDirectionIcon = DIRECTION_ICONS[predictedDirection];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background text-bodyText">
      {/* Burn-in mitigation: the canvas creeps a few pixels on a slow loop so
          no bright glyph holds one panel pixel for the length of an event. */}
      <div className="flex h-full flex-col gap-[1.2vh] p-[2.2vh] animate-[kiosk-drift_300s_ease-in-out_infinite] motion-reduce:animate-none">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-[1.2em]">
            {/* The one always-live control: a way out of the kiosk. Kept out
                of the auto-hiding cluster because the wordmark is branding a
                viewer expects to see, and staying visible is what makes it
                discoverable as the way back. Network-scoped, so leaving
                /sepolia/live lands on Sepolia's dashboard. */}
            <NetworkLink
              href="/"
              aria-label="Leave TV mode for the dashboard"
              className="font-windsor-bold text-[clamp(1rem,min(1.5vw,2.6vh),1.75rem)] leading-none text-titleText transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
            >
              BlobFlow
            </NetworkLink>
            <span className="text-[clamp(0.7rem,min(1vw,1.8vh),1.1rem)] uppercase tracking-[0.2em] text-[#6e7687]">
              {headlinePricing?.networkName ?? selectedNetwork.name}
            </span>
            {/* Always visible (not part of the auto-hiding controls) so a
                screenshot of a focused kiosk carries its own context. */}
            {focus && (
              <span className="flex min-w-0 items-center gap-2 text-[clamp(0.7rem,min(1vw,1.8vh),1.1rem)] text-lightBlue">
                {/* Only a named rollup gets a logo. An address has no entity
                    behind it, and the badge's unknown-sender placeholder (a
                    "?" with the network ribbon) reads as a broken icon. */}
                {focus.kind === 'rollup' ? (
                  <>
                    <AttributionBadge
                      user={focus.value}
                      sizeClass="h-[1.4em] w-[1.4em]"
                      px={24}
                      textClass="text-[0.6em]"
                    />
                    <span className="max-w-[14em] truncate uppercase tracking-[0.2em]">
                      {focus.label}
                    </span>
                  </>
                ) : (
                  // Hex stays lower case and monospaced: uppercasing turns
                  // the prefix into "0X" and makes the digits hard to scan.
                  <span className="max-w-[14em] truncate font-mono">{focus.label}</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-[1.5em]">
            <span
              className={`flex items-center gap-2 text-[clamp(0.7rem,min(1vw,1.8vh),1.1rem)] uppercase tracking-[0.15em] ${connection.textClass}`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${connection.dotClass}`} />
                {!connection.isDegraded && pulseKey > 0 && (
                  <span
                    key={pulseKey}
                    className={`absolute inset-0 rounded-full ${connection.dotClass} animate-[live-activity-pulse_800ms_ease-out_forwards] motion-reduce:animate-none`}
                  />
                )}
              </span>
              {connection.label}
            </span>
            <KioskClock />
            <KioskControls />
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <DataStateWrapper
            isLoading={isLoading && !hasRenderableData}
            error={hasRenderableData ? null : error}
            loadingComponent={<KioskPanelSkeleton />}
            errorComponent={(loadError) => (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="font-windsor-bold text-[clamp(1.5rem,min(3vw,5vh),3rem)] text-white">
                  Waiting for the blob market
                </p>
                <p className="text-[clamp(0.8rem,min(1.2vw,2vh),1.25rem)] text-[#6e7687]">
                  {loadError.message}
                </p>
              </div>
            )}
          >
            <div className="grid h-full grid-rows-[3fr_2fr] gap-[1.2vh]">
              {/* Right now */}
              <div className="grid min-h-0 grid-cols-1 gap-[1.2vh] lg:grid-cols-12">
                <Panel className="flex flex-col lg:col-span-7" pulseKey={pulseKey}>
                  <div className="flex min-h-0 flex-1 flex-col justify-center px-[3vh]">
                    <PanelLabel>Blob base fee</PanelLabel>
                    <div className="mt-[0.3em] flex items-center gap-[0.25em]">
                      <span className="font-windsor-bold tabular-nums leading-[0.9] text-white text-[clamp(2.5rem,min(9vw,19vh),12rem)]">
                        {formatFeeNumber(currentFeeGwei)}
                      </span>
                      <FeeDirectionIcon
                        className={`h-[clamp(1.5rem,min(3.5vw,7vh),4.5rem)] w-[clamp(1.5rem,min(3.5vw,7vh),4.5rem)] shrink-0 ${DIRECTION_TEXT[feeDirection]}`}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="sr-only">
                      Blob base fee {formatFeeNumber(currentFeeGwei)} Gwei, {DIRECTION_LABEL[feeDirection]}.
                    </p>
                    <span
                      aria-hidden="true"
                      className="text-[clamp(0.9rem,min(2vw,3.8vh),2.25rem)] uppercase tracking-[0.25em] text-[#6e7687]"
                    >
                      Gwei
                    </span>

                    <div className="mt-[1.2em] flex flex-wrap items-baseline gap-x-[1.5em] gap-y-[0.4em] text-[clamp(0.85rem,min(1.3vw,2.3vh),1.5rem)]">
                      {/* The prediction is REST-only. On a websocket-only
                          bootstrap there is none, and printing "0 Gwei" would
                          read as a real forecast of zero. */}
                      {predictedFeeGwei > 0 && (
                        <span className="flex items-baseline gap-[0.4em] text-[#a9adb6]">
                          Next block
                          <PredictedDirectionIcon
                            className={`h-[1em] w-[1em] shrink-0 translate-y-[0.1em] ${DIRECTION_TEXT[predictedDirection]}`}
                            aria-hidden="true"
                          />
                          <span className="tabular-nums text-white">
                            {formatFeeNumber(predictedFeeGwei)} Gwei
                          </span>
                        </span>
                      )}
                      {rangeTrend && (
                        <span className={`tabular-nums ${DIRECTION_TEXT[trendDirection]}`}>
                          {formatSignedPercent(rangeTrend.deltaPercent)} · 1h
                        </span>
                      )}
                      {headBlock && (
                        <span className="tabular-nums text-[#6e7687]">
                          Block {headBlock.blockNumber.toLocaleString()}
                          {blockAgeSeconds !== null ? ` · ${blockAgeSeconds}s ago` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fee shape over the last hour, bleeding to the panel
                      edges. Decorative for assistive tech: the readout,
                      trend percent, and low/high caption carry the same
                      information as text. */}
                  {chartPoints.length > 1 && (
                    <div className="relative h-[32%] shrink-0" aria-hidden="true">
                      {feeExtremes && (
                        <span className="absolute right-[3vh] top-0 z-10 tabular-nums text-[clamp(0.6rem,min(0.85vw,1.5vh),0.95rem)] text-[#6e7687]">
                          1h · low {formatFeeNumber(feeExtremes.lowGwei)} · avg{' '}
                          {formatFeeNumber(feeExtremes.averageGwei)} · high{' '}
                          {formatFeeNumber(feeExtremes.highGwei)}
                        </span>
                      )}
                      <KioskFeeChart
                        points={chartPoints}
                        averageGwei={feeExtremes?.averageGwei}
                      />
                    </div>
                  )}
                  {feeExtremes && (
                    <p className="sr-only">
                      Blob base fee over the last hour: low {formatFeeNumber(feeExtremes.lowGwei)}{' '}
                      Gwei, average {formatFeeNumber(feeExtremes.averageGwei)} Gwei, high{' '}
                      {formatFeeNumber(feeExtremes.highGwei)} Gwei.
                    </p>
                  )}
                </Panel>

                {/* Rollup share is the most durable panel on the wall, so it
                    gets the tall slot; the per-block gauge lives below. */}
                <Panel className="p-[2.5vh] lg:col-span-5">
                  <KioskTopRollups
                    rollups={rollups}
                    shareLabel="last hour"
                    isUnavailable={Boolean(topUsersError) && !topUsers}
                  />
                </Panel>
              </div>

              {/* Recent past, and what is queued next */}
              <div className="grid min-h-0 grid-cols-1 gap-[1.2vh] lg:grid-cols-12">
                <Panel className="flex flex-col p-[2.2vh] lg:col-span-6">
                  <PanelLabel>
                    {focus ? (
                      <>Blocks · <FocusLabel focus={focus} /> blobs</>
                    ) : (
                      'Blocks · newest first'
                    )}
                  </PanelLabel>
                  <div className="mt-[0.9em] min-h-0 flex-1">
                    <KioskBlockTicker slots={tickerSlots} newestKey={newestTickerKey} />
                  </div>
                </Panel>

                <Panel className="p-[2.2vh] lg:col-span-3">
                  <KioskMempoolPanel
                    mempool={mempool}
                    focus={focus}
                    isUnavailable={Boolean(mempoolError) && !mempoolTransactions}
                  />
                </Panel>

                <Panel className="flex flex-col p-[2.2vh] lg:col-span-3" pulseKey={pulseKey}>
                  <PanelLabel>Blobspace fullness</PanelLabel>
                  <div className="min-h-0 flex-1">
                    <KioskFullnessGauge fullness={fullness} compact />
                  </div>
                  {headlinePricing && (
                    <div className="flex shrink-0 items-baseline justify-between gap-3 text-[clamp(0.65rem,min(0.9vw,1.6vh),1rem)] text-[#6e7687]">
                      <span className="tabular-nums">
                        Full streak{' '}
                        <span className="text-white">
                          {headlinePricing.marketPressure.consecutiveFullBlocks.toLocaleString()}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        At max{' '}
                        <span className="text-white">
                          {formatPercent(
                            headlinePricing.marketPressure.percentRecentBlocksAtMaxBlobs,
                            0
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </DataStateWrapper>
        </div>
      </div>

    </div>
  );
}

/**
 * Wall clock for the status strip. Rendered only after mount: the server has
 * no idea what time it is where the screen hangs, and painting one time then
 * swapping it on hydration would be a mismatch.
 */
function KioskClock() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const now = useNow();

  return (
    <span className="tabular-nums text-[clamp(0.7rem,min(1vw,1.8vh),1.1rem)] text-[#6e7687]">
      {isMounted
        ? new Date(now).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })
        : ''}
    </span>
  );
}
