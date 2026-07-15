"use client";

import React from 'react';
import { api } from '../lib/api';
import { useApiData } from './useApiData';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { BackendBlobPricingRecentBlock, BlobPricing } from '../types';

/** Matches the hero's pricing-head fallback poll; new_block events lead. */
const PRICING_HEAD_REFRESH_MS = 30000;

export interface LiveBlobBaseFee {
  network?: string;
  wei: string;
  blockNumber: number;
}

/**
 * Pick the freshest known blob base fee by block number. Live WebSocket
 * values lead between REST polls, but if the socket goes quiet while the
 * chain advances, the REST poll overtakes the stale live value instead of
 * being masked by it for the rest of the session. Live values from another
 * network never apply. Exported for tests.
 */
export function selectLatestBlobBaseFee(
  liveFee: LiveBlobBaseFee | null,
  pricingHead: BlobPricing | undefined,
  network?: string
): string | null {
  const live = liveFee && liveFee.network === network ? liveFee : null;

  const restHeadBlock = pricingHead?.recentBlocks?.length
    ? pricingHead.recentBlocks.reduce(
        (max, block) => Math.max(max, block.blockNumber),
        0
      )
    : null;

  if (live && (restHeadBlock === null || live.blockNumber >= restHeadBlock)) {
    return live.wei;
  }
  return pricingHead?.currentBaseFeeWei ?? null;
}

/**
 * Latest blob base fee in wei, seeded from the pricing head endpoint and kept
 * current by the per-block pricing attached to new_block WebSocket events and
 * the block_snapshot replay sent on every (re)connect. Shares the
 * ['blob-pricing-head', network] cache entry with BlobFeeHero, so mounting
 * both costs a single fetch.
 *
 * Returns null until either source responds.
 */
export function useLatestBlobBaseFee(network?: string): string | null {
  const fetchPricingHead = React.useCallback(() => api.getBlobPricing(network), [network]);
  const { data: pricingHead } = useApiData<BlobPricing>(
    fetchPricingHead,
    ['blob-pricing-head', network],
    { refetchInterval: PRICING_HEAD_REFRESH_MS }
  );

  const [liveFee, setLiveFee] = React.useState<LiveBlobBaseFee | null>(null);

  const applyPricingRecord = React.useCallback(
    (pricing: BackendBlobPricingRecentBlock | undefined) => {
      if (!pricing?.blob_base_fee) return;
      setLiveFee((current) =>
        current &&
        current.network === network &&
        current.blockNumber >= pricing.block_number
          ? current
          : { network, wei: pricing.blob_base_fee, blockNumber: pricing.block_number }
      );
    },
    [network]
  );

  useLiveBlobEvent('new_block', (event) => {
    applyPricingRecord(event.data.pricing);
  });

  // Sent on every (re)connect with recent blocks newest first: recovers the
  // head fee after a socket outage without waiting for the next block.
  useLiveBlobEvent('block_snapshot', (event) => {
    applyPricingRecord(event.data.blocks[0]?.pricing);
  });

  return selectLatestBlobBaseFee(liveFee, pricingHead, network);
}
