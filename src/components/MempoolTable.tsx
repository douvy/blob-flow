"use client";

import Link from '@/components/NetworkLink';
import React from 'react';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatBlobCount,
  formatBlobSize,
} from '../utils';
import { useMempoolLiveList } from '../hooks/useMempoolLiveList';
import { useFlipRows } from '../hooks/useFlipRows';
import {
  groupMempoolByTransaction,
  isPartiallySampled,
  withLowerBound,
  type PendingMempoolTransaction,
} from '../lib/mempoolTransactions';
import MempoolTransactionDetailsModal from './MempoolTransactionDetailsModal';
import AttributionBadge from './AttributionBadge';
import { RelativeTime } from './RelativeTime';
import { FEE_HEADROOM_TOOLTIP } from '../constants';

export default function MempoolTable({ limit = 10 }: { limit?: number }) {
  const { selectedNetwork } = useNetwork();
  const [selected, setSelected] = React.useState<PendingMempoolTransaction | null>(null);
  const tbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  useFlipRows(tbodyRef, selectedNetwork.apiParam);

  const { transactions, isLoading, error } = useMempoolLiveList(
    limit,
    selectedNetwork.apiParam
  );

  // The feed is one entry per blob, so a multi-blob transaction arrives as
  // several entries sharing a hash. Rolling them up is what lets this table
  // show one row per transaction carrying its real blob count and total cost,
  // rather than a run of near-identical rows each claiming a single blob.
  const pendingTransactions = React.useMemo(
    () => (transactions ? groupMempoolByTransaction(transactions) : null),
    [transactions]
  );
  // An open modal tracks its transaction in the live list so a blob arriving
  // for it updates the totals on screen, and keeps the last known figures if
  // the transaction gets mined rather than closing itself mid-read.
  const selectedTransaction = selected
    ? (pendingTransactions?.find((tx) => tx.txHash === selected.txHash) ?? selected)
    : null;

  // Fee Cap and Time collapse into sublines below sm/md. (The lg-to-xl
  // collapse from the old homepage placement is gone: this table now renders
  // full-width on /mempool only.)
  const tableHeader = (
    <thead>
      <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
        <th className="py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">TX Hash</th>
        <th className="py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">Sender</th>
        <th className="py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Blobs</th>
        <th className="hidden sm:table-cell py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[19%] whitespace-nowrap">Fee Cap</th>
        <th className="py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">Cost</th>
        <th className="hidden md:table-cell py-3 px-2 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%] whitespace-nowrap">Time</th>
      </tr>
    </thead>
  );

  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="w-full overflow-hidden table-fixed">
        {tableHeader}
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
              <td className="py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-24 max-w-full animate-pulse mb-2"></div>
                <div className="h-3 bg-[#26282e] rounded w-14 max-w-full animate-pulse md:hidden"></div>
              </td>
              <td className="py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-20 max-w-full animate-pulse mb-2"></div>
                <div className="h-3 bg-[#26282e] rounded w-14 max-w-full animate-pulse"></div>
              </td>
              <td className="py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-12 max-w-full animate-pulse mb-2"></div>
                <div className="h-3 bg-[#26282e] rounded w-10 max-w-full animate-pulse"></div>
              </td>
              <td className="hidden sm:table-cell py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-16 max-w-full animate-pulse mb-2"></div>
                <div className="h-3 bg-[#26282e] rounded w-12 max-w-full animate-pulse"></div>
              </td>
              <td className="py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-20 max-w-full animate-pulse mb-2"></div>
                <div className="h-3 bg-[#26282e] rounded w-16 max-w-full animate-pulse"></div>
                <div className="h-3 bg-[#26282e] rounded w-14 max-w-full animate-pulse mt-2 sm:hidden"></div>
              </td>
              <td className="hidden md:table-cell py-3 px-2">
                <div className="h-5 bg-[#26282e] rounded w-12 max-w-full animate-pulse"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const truncateTxHash = (hash: string): string => {
    if (hash.length <= 10) return hash;
    return `${hash.substring(0, 8)}...`;
  };

  return (
    <section className="pt-2">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Pending Transactions</h2>

      <DataStateWrapper
        isLoading={isLoading && !transactions}
        error={transactions ? null : error}
        loadingComponent={loadingComponent}
      >
        {pendingTransactions && (
          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="w-full overflow-hidden table-fixed">
              {tableHeader}
              <tbody ref={tbodyRef} className="divide-y divide-divider">
                {pendingTransactions.length === 0 && (
                  <tr className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                    <td colSpan={6} className="py-6 px-4 text-center text-sm text-[#8a93a5]">
                      No pending blob transactions right now.
                    </td>
                  </tr>
                )}
                {pendingTransactions.map((tx: PendingMempoolTransaction) => {
                  const user = tx.user || 'Unknown';
                  const rowKey = tx.txHash;
                  // Totals cover the blobs in the sample, so a transaction the
                  // sample limit split is marked as a lower bound instead of
                  // passing a partial sum off as the transaction's.
                  const partialSample = isPartiallySampled(tx);
                  const partialTitle = partialSample
                    ? `This sample holds ${tx.sampledBlobCount} of the transaction's ${tx.blobCount} blobs, so size and cost are lower bounds.`
                    : undefined;

                  return (
                    <tr
                      key={rowKey}
                      data-row-key={rowKey}
                      className="bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 transition-colors"
                    >
                      <td className="py-3 px-2 text-xs sm:text-sm font-mono text-white">
                        <button
                          type="button"
                          onClick={() => setSelected(tx)}
                          className="max-w-full truncate cursor-pointer rounded text-left text-white underline decoration-[#3B55E6]/50 underline-offset-4 transition-colors hover:text-[#9ac4fd] focus:outline-none focus:ring-2 focus:ring-[#3B55E6] focus:ring-offset-2 focus:ring-offset-[#17181b]"
                          title={tx.txHash}
                          aria-label={`View pending transaction details for ${tx.txHash}`}
                        >
                          {truncateTxHash(tx.txHash)}
                        </button>
                        <div className="text-xs text-[#8a93a5] mt-1 font-sans truncate md:hidden"><RelativeTime timestamp={tx.timeInMempool} /></div>
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-white">
                        <div className="font-mono truncate" title={tx.fromAddressFull}>
                          {tx.fromAddressFull ? (
                            <Link
                              href={`/user/${encodeURIComponent(tx.fromAddressFull)}`}
                              className="text-blue hover:underline"
                            >
                              {tx.fromAddress}
                            </Link>
                          ) : (
                            <span>{tx.fromAddress}</span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-[#8a93a5] mt-1 min-w-0">
                          <AttributionBadge
                            user={user}
                            sizeClass="w-4 h-4"
                            className="mr-2"
                            px={16}
                          />
                          <span className="truncate">{user}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-white">
                        <div className="truncate">{formatBlobCount(tx.blobCount)}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 truncate" title={partialTitle}>
                          {withLowerBound(formatBlobSize(tx.blobSizeBytes), partialSample)}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-2 text-xs sm:text-sm text-white">
                        <div className="truncate" title={tx.maxFeeGwei}>{tx.maxFeeGwei}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 truncate" title={FEE_HEADROOM_TOOLTIP}>{tx.feeHeadroom} room</div>
                      </td>
                      <td className="py-3 px-2 text-xs sm:text-sm text-white">
                        <div className="truncate" title={partialTitle ?? tx.realizedCost}>{withLowerBound(tx.realizedCost, partialSample)}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 truncate" title={partialTitle ?? `max ${tx.maxCost}`}>max {withLowerBound(tx.maxCost, partialSample)}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 truncate sm:hidden" title={FEE_HEADROOM_TOOLTIP}>{tx.feeHeadroom} room</div>
                      </td>
                      <td className="hidden md:table-cell py-3 px-2 text-xs sm:text-sm text-white truncate"><RelativeTime timestamp={tx.timeInMempool} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
      <MempoolTransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
