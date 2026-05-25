"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/constants';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { BlobPricing, MempoolPressure } from '@/types';
import { formatNumber, formatPercent } from '@/utils';
import DataStateWrapper from './DataStateWrapper';

const FALLBACK_REFRESH_MS = 60000;
const STALE_AFTER_MS = 90000;

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

interface MarketSnapshot {
  pricing: BlobPricing;
  pressure: MempoolPressure;
}

interface NewBlockMessage {
  type: 'new_block';
}

export default function BlobMarketPanels() {
  const { selectedNetwork } = useNetwork();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const isMountedRef = useRef(false);
  const snapshotRef = useRef<MarketSnapshot | undefined>(undefined);
  const requestIdRef = useRef(0);

  const fetchMarketData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const hasSnapshot = Boolean(snapshotRef.current);

    if (hasSnapshot) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [pricing, pressure] = await Promise.all([
        api.getBlobPricing(selectedNetwork.apiParam, 20),
        api.getMempoolPressure(selectedNetwork.apiParam),
      ]);

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const nextSnapshot = { pricing, pressure };
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      setLastUpdatedAt(Date.now());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setError(err instanceof Error ? err : new Error('Unable to load market data'));
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [selectedNetwork.apiParam]);

  useEffect(() => {
    isMountedRef.current = true;
    snapshotRef.current = undefined;
    setSnapshot(undefined);
    setError(null);
    setLastUpdatedAt(null);
    setIsLoading(true);
    void fetchMarketData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMarketData]);

  useEffect(() => {
    let isClosed = false;
    let socket: WebSocket | null = null;
    setRealtimeStatus('connecting');

    try {
      socket = new WebSocket(getMarketWebSocketUrl(selectedNetwork.apiParam));
      socket.addEventListener('open', () => {
        if (!isClosed) {
          setRealtimeStatus('connected');
        }
      });
      socket.addEventListener('message', (event: MessageEvent) => {
        if (isClosed || typeof event.data !== 'string') {
          return;
        }

        try {
          const message: unknown = JSON.parse(event.data);
          if (isNewBlockMessage(message)) {
            setRealtimeStatus('connected');
            void fetchMarketData();
          }
        } catch {
          // Ignore malformed realtime messages; interval refresh is still active.
        }
      });
      socket.addEventListener('error', () => {
        if (!isClosed) {
          setRealtimeStatus('disconnected');
        }
      });
      socket.addEventListener('close', () => {
        if (!isClosed) {
          setRealtimeStatus('disconnected');
        }
      });
    } catch {
      setRealtimeStatus('disconnected');
    }

    const fallbackTimer = window.setInterval(() => {
      void fetchMarketData();
    }, FALLBACK_REFRESH_MS);

    return () => {
      isClosed = true;
      window.clearInterval(fallbackTimer);
      socket?.close();
    };
  }, [fetchMarketData, selectedNetwork.apiParam]);

  useEffect(() => {
    const staleTimer = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(staleTimer);
    };
  }, []);

  const isStale = lastUpdatedAt !== null && now - lastUpdatedAt > STALE_AFTER_MS;
  const initialError = snapshot ? null : error;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-windsor-bold text-white">Blob Market</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8f9aad]">
          <MarketStatusPill status={realtimeStatus} isStale={isStale} />
          {isRefreshing && <span className="text-blue">Refreshing</span>}
          <span>{lastUpdatedAt ? `Updated ${formatUpdatedAt(lastUpdatedAt)}` : 'Waiting for data'}</span>
        </div>
      </div>

      <DataStateWrapper
        isLoading={isLoading && !snapshot}
        error={initialError}
        loadingComponent={<BlobMarketSkeleton />}
      >
        {snapshot && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PricingPanel pricing={snapshot.pricing} />
            <PressurePanel pressure={snapshot.pressure} />
          </div>
        )}
      </DataStateWrapper>

      {snapshot && error && (
        <p className="mt-3 text-xs text-red-300">
          Refresh failed: {error.message}. Showing the latest available market data.
        </p>
      )}
    </section>
  );
}

function PricingPanel({ pricing }: { pricing: BlobPricing }) {
  const direction = pricing.marketPressure.predictedDirection.toLowerCase();
  const directionClass = getDirectionClass(direction);
  const utilizationPercent = formatPercent(pricing.currentUtilization * 100);

  return (
    <article className="rounded-lg border border-divider bg-[#161a29]/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">Blob Pricing</h3>
          <p className="text-sm text-[#8f9aad]">{pricing.forkStage} fork parameters</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs capitalize ${directionClass}`}>
          {direction || 'stable'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <MetricBlock label="Current base fee" value={pricing.currentBaseFee} />
        <MetricBlock label="Predicted next fee" value={pricing.predictedNextFee} />
      </div>

      <div className="mt-5 border-t border-divider pt-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <MetricBlock
            label="Next-block range"
            value={`${pricing.marketPressure.nextBlockFeeEstimate.low} - ${pricing.marketPressure.nextBlockFeeEstimate.high}`}
            compact
          />
          <MetricBlock label="Current utilization" value={utilizationPercent} compact />
          <MetricBlock
            label="Target / max blobs"
            value={`${pricing.blobParams.target.toLocaleString()} / ${pricing.blobParams.max.toLocaleString()}`}
            compact
          />
          <MetricBlock
            label="Excess blob gas"
            value={formatNumber(pricing.currentExcessGas)}
            compact
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-divider pt-5">
        <MiniStat label="Above target" value={pricing.marketPressure.recentBlocksAboveTarget.toString()} />
        <MiniStat label="Full streak" value={pricing.marketPressure.consecutiveFullBlocks.toString()} />
        <MiniStat
          label="At max"
          value={formatPercent(pricing.marketPressure.percentRecentBlocksAtMaxBlobs)}
        />
      </div>
    </article>
  );
}

function PressurePanel({ pressure }: { pressure: MempoolPressure }) {
  const totalPending = pressure.pendingBlobCount;
  const includability = pressure.includability;

  return (
    <article className="rounded-lg border border-divider bg-[#161a29]/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white">Inclusion Pressure</h3>
          <p className="text-sm text-[#8f9aad]">
            {includability.pricingAvailable ? `Base fee ${includability.latestBlobBaseFee}` : 'Pricing unavailable'}
          </p>
        </div>
        <span className="rounded-full border border-blue/40 bg-blue/10 px-3 py-1 text-xs text-blue">
          {totalPending.toLocaleString()} pending
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="Blob gas" value={formatNumber(pressure.pendingBlobGas)} />
        <MiniStat label="Senders" value={pressure.pendingUniqueSenders.toLocaleString()} />
        <MiniStat label="Sample" value={pressure.sampleTruncated ? `${pressure.sampleLimit}+` : pressure.sampleLimit.toLocaleString()} />
      </div>

      <div className="mt-5 border-t border-divider pt-5 space-y-4">
        <InclusionBar
          label="Likely includable"
          value={includability.likelyIncludableCount}
          total={totalPending}
          colorClass="bg-green-400"
        />
        <InclusionBar
          label="Underpriced"
          value={includability.underpricedCount}
          total={totalPending}
          colorClass="bg-amber-300"
        />
        <InclusionBar
          label="Unknown pricing"
          value={includability.unknownPricingCount}
          total={totalPending}
          colorClass="bg-[#8f9aad]"
        />
      </div>

      <div className="mt-5 border-t border-divider pt-5">
        <h4 className="text-sm font-medium text-white mb-3">Mempool fee distribution</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MiniStat label="Min" value={pressure.feeDistribution.min} />
          <MiniStat label="Median" value={pressure.feeDistribution.median} />
          <MiniStat label="Avg" value={pressure.feeDistribution.avg} />
          <MiniStat label="P95" value={pressure.feeDistribution.p95} />
          <MiniStat label="Max" value={pressure.feeDistribution.max} />
        </div>
      </div>

      <div className="mt-5 border-t border-divider pt-5">
        <h4 className="text-sm font-medium text-white mb-3">Pending age</h4>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Newest" value={pressure.pendingTransactionAge.newest} />
          <MiniStat label="Average" value={pressure.pendingTransactionAge.average} />
          <MiniStat label="Oldest" value={pressure.pendingTransactionAge.oldest} />
        </div>
      </div>
    </article>
  );
}

function MetricBlock({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-[#8f9aad]">{label}</div>
      <div className={`${compact ? 'text-base' : 'text-2xl'} mt-1 font-medium text-white break-words`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[#8f9aad]">{label}</div>
      <div className="mt-1 text-sm font-medium text-white break-words">{value}</div>
    </div>
  );
}

function InclusionBar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-white">{label}</span>
        <span className="text-[#8f9aad]">{value.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#202538]">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function MarketStatusPill({ status, isStale }: { status: RealtimeStatus; isStale: boolean }) {
  const config = getStatusConfig(status, isStale);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${config.className}`}>
      <span className={`h-2 w-2 rounded-full ${config.dotClassName}`} />
      {config.label}
    </span>
  );
}

function BlobMarketSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {[...Array(2)].map((_, index) => (
        <div key={index} className="animate-pulse rounded-lg border border-divider bg-[#161a29]/80 p-5">
          <div className="h-6 w-1/3 rounded bg-[#202538] mb-5" />
          <div className="grid grid-cols-2 gap-5">
            <div className="h-20 rounded bg-[#202538]" />
            <div className="h-20 rounded bg-[#202538]" />
          </div>
          <div className="mt-5 h-28 rounded bg-[#202538]" />
        </div>
      ))}
    </div>
  );
}

function getMarketWebSocketUrl(network: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(API_BASE_URL, origin);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  url.search = '';
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('network', network);
  return url.toString();
}

function isNewBlockMessage(value: unknown): value is NewBlockMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (value as { type?: unknown }).type === 'new_block';
}

function getStatusConfig(status: RealtimeStatus, isStale: boolean) {
  if (isStale) {
    return {
      label: 'Stale',
      className: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
      dotClassName: 'bg-amber-300',
    };
  }

  if (status === 'connected') {
    return {
      label: 'Live',
      className: 'border-green-400/40 bg-green-400/10 text-green-300',
      dotClassName: 'bg-green-400',
    };
  }

  if (status === 'connecting') {
    return {
      label: 'Connecting',
      className: 'border-blue/40 bg-blue/10 text-blue',
      dotClassName: 'bg-blue',
    };
  }

  return {
    label: 'Disconnected',
    className: 'border-red-300/40 bg-red-300/10 text-red-200',
    dotClassName: 'bg-red-300',
  };
}

function getDirectionClass(direction: string): string {
  if (direction === 'up') {
    return 'border-red-300/40 bg-red-300/10 text-red-200';
  }

  if (direction === 'down') {
    return 'border-green-400/40 bg-green-400/10 text-green-300';
  }

  return 'border-[#8f9aad]/40 bg-[#8f9aad]/10 text-[#d7dde8]';
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}
