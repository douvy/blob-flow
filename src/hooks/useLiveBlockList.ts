"use client";

import React from 'react';
import { useApiData } from './useApiData';
import { api } from '../lib/api';
import { useNetwork } from './useNetwork';
import { useLiveBlobEvent } from '../contexts/LiveDataContext';
import { transformNewBlockData } from '../lib/api/blocks';
import { Block, LatestBlocksResponse } from '../types';

interface LiveBlockState {
  network: string;
  blocks: Block[];
}

// Folds incoming blocks into the list: incoming data wins per block number,
// and the newest `limit` blocks overall are kept.
function mergeBlockLists(blocks: Block[], incoming: Block[], limit: number): Block[] {
  const merged = new Map<string, Block>();
  for (const block of blocks) {
    merged.set(block.number, block);
  }
  for (const block of incoming) {
    merged.set(block.number, block);
  }
  return Array.from(merged.values())
    .sort((left, right) => Number(right.number) - Number(left.number))
    .slice(0, limit);
}

/**
 * The newest `limit` blocks for the selected network, kept current by folding
 * every `new_block` event and reconnect `block_snapshot` over the REST
 * baseline.
 *
 * A live block replaces its fetched counterpart wholesale: the indexer
 * attaches full pricing to every broadcast (including zero-blob blocks) and
 * re-broadcasts reorged blocks, so websocket data is never poorer than REST
 * data for the same block number. Gaps deeper than the snapshot window heal
 * through the React Query invalidation LiveDataContext performs on reconnect.
 */
export function useLiveBlockList(limit: number) {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;
  const [liveState, setLiveState] = React.useState<LiveBlockState>({ network, blocks: [] });

  useLiveBlobEvent('new_block', (event) => {
    const liveBlock = transformNewBlockData(event.data);
    setLiveState((currentState) => ({
      network,
      blocks: mergeBlockLists(
        currentState.network === network ? currentState.blocks : [],
        [liveBlock],
        limit
      ),
    }));
  });

  // The server sends the recent blocks on every (re)connect, closing the gap
  // of events broadcast while this client was disconnected.
  useLiveBlobEvent('block_snapshot', (event) => {
    const snapshotBlocks = event.data.blocks.map((blockData) =>
      transformNewBlockData(blockData)
    );
    setLiveState((currentState) => ({
      network,
      blocks: mergeBlockLists(
        currentState.network === network ? currentState.blocks : [],
        snapshotBlocks,
        limit
      ),
    }));
  });

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(limit, network),
    ['latest-blocks', network, limit]
  );

  const blocks = React.useMemo<Block[]>(() => {
    const fetchedBlocks = data?.data ?? [];
    const liveBlocks = liveState.network === network ? liveState.blocks : [];
    return mergeBlockLists(fetchedBlocks, liveBlocks, limit);
  }, [data, liveState, network, limit]);

  return { blocks, isLoading, error };
}
