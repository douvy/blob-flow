"use client";

import React from 'react';
import type { BlockTipSummary } from '@/lib/blockTips';
import { PRIORITY_FEE_TOOLTIP } from '@/constants';
import BlockTipChart from './BlockTipChart';

/**
 * The tips a block's blob transactions paid, one bar per transaction. A
 * block indexed before priority fees were stored has nothing to plot and
 * says so rather than drawing an empty chart.
 */
export default function BlockTipsSection({ summary }: { summary: BlockTipSummary }) {
  if (summary.totalBlobs === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-windsor-bold text-white mb-1">Tips</h2>
      <p className="text-bodyText text-sm mb-4" title={PRIORITY_FEE_TOOLTIP}>
        Priority fee each blob transaction paid per unit of execution gas, highest bid first. When
        blob slots are contested, higher tips are the main lever for getting in, so the top bars
        show who paid most for this block&apos;s blobspace.
      </p>
      <div className="border border-divider rounded-lg bg-[#0f1322] px-2 py-3">
        {summary.pricedBlobs > 0 ? (
          <>
            <BlockTipChart transactions={summary.transactions} />
            {summary.pricedBlobs < summary.totalBlobs && (
              <p className="px-2 pt-2 text-xs text-[#6e7787]">
                Tips recorded for {summary.pricedBlobs} of {summary.totalBlobs} blobs; the rest were
                indexed before tips were tracked.
              </p>
            )}
          </>
        ) : (
          <p className="px-2 py-3 text-sm text-[#6c727f]">
            No tips recorded for this block: it was indexed before tips were tracked, so its blob
            transactions carry no priority fee data until the block is reindexed.
          </p>
        )}
      </div>
    </section>
  );
}
