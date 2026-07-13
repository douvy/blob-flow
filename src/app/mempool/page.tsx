"use client";

import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import React from 'react';
import AttributionBadge from '@/components/AttributionBadge';
import DataStateWrapper from '@/components/DataStateWrapper';
import MempoolTable from '@/components/MempoolTable';
import { MEMPOOL_SAMPLE_LIMIT } from '@/constants';
import { useMempoolLiveList } from '@/hooks/useMempoolLiveList';
import { useMempoolPressure } from '@/hooks/useMempoolPressure';
import { useNetwork } from '@/hooks/useNetwork';
import {
  MEMPOOL_PRIVATE_CAVEAT,
  aggregateMempoolAttribution,
} from '@/lib/mempoolAttribution';
import { formatBlobCount, formatBlobSize } from '@/utils';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-[#292e35] bg-[#17181b] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-white tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-[#666666]">{hint}</div>}
    </div>
  );
}

export default function MempoolPage() {
  const { selectedNetwork } = useNetwork();
  const network = selectedNetwork.apiParam;

  const { data: pressure } = useMempoolPressure(network);

  const { transactions, truncated, isLoading, error } = useMempoolLiveList(
    MEMPOOL_SAMPLE_LIMIT,
    network
  );

  const summary = React.useMemo(
    () => aggregateMempoolAttribution(transactions ?? []),
    [transactions]
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link
        href="/"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <section>
        <h1 className="text-3xl font-windsor-bold text-white mb-2">Mempool</h1>
        <p className="text-sm text-bodyText mb-4">
          Blob transactions waiting to be included in a block, attributed to the L2s and
          providers that sent them.
        </p>
        <div className="mb-8 flex max-w-3xl items-start gap-2.5 rounded-md border border-[#292e35] bg-[#17181b] px-3.5 py-3 text-sm text-[#a9adb6]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden="true" />
          <p>{MEMPOOL_PRIVATE_CAVEAT}</p>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Pending blobs"
            value={pressure ? pressure.pendingBlobCount.toLocaleString() : '-'}
            hint="public mempool"
          />
          <StatCard
            label="Unique senders"
            value={pressure ? pressure.pendingUniqueSenders.toLocaleString() : '-'}
          />
          <StatCard
            label="Likely includable"
            value={pressure ? pressure.includability.likelyIncludableCount.toLocaleString() : '-'}
            hint="at current base fee"
          />
          <StatCard
            label="Oldest pending"
            value={pressure ? pressure.pendingTransactionAge.oldest : '-'}
            hint="time in mempool"
          />
        </div>

        <h2 className="text-2xl font-windsor-bold text-white mb-4">By Sender</h2>
        <DataStateWrapper
          isLoading={isLoading && !transactions}
          error={transactions ? null : error}
          loadingComponent={
            <div className="h-40 animate-pulse rounded-lg border border-divider bg-[#14161a]" />
          }
        >
          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="min-w-full overflow-hidden">
              <thead>
                <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Sender</th>
                  <th className="py-3 px-3 sm:px-4 text-right text-xs font-medium text-[#6e7787] uppercase tracking-wider">Txs</th>
                  <th className="py-3 px-3 sm:px-4 text-right text-xs font-medium text-[#6e7787] uppercase tracking-wider">Blobs</th>
                  <th className="py-3 px-3 sm:px-4 text-right text-xs font-medium text-[#6e7787] uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {summary.groups.length === 0 && (
                  <tr className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                    <td colSpan={4} className="py-6 px-4 text-center text-sm text-[#8a93a5]">
                      No pending blob transactions right now.
                    </td>
                  </tr>
                )}
                {summary.groups.map((group) => (
                  <tr
                    key={group.user}
                    className="bg-gradient-to-r from-[#17181b] to-[#141519]/60"
                  >
                    <td className="py-3 px-3 sm:px-4 text-sm text-white">
                      <div className="flex items-center gap-2">
                        <AttributionBadge user={group.user} sizeClass="h-4 w-4" />
                        {group.address ? (
                          <Link
                            href={`/user/${encodeURIComponent(group.address)}`}
                            className="truncate text-blue hover:underline"
                          >
                            {group.user}
                          </Link>
                        ) : (
                          <span className="truncate">{group.user}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-sm text-white tabular-nums">
                      {group.txCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-sm text-white tabular-nums">
                      {formatBlobCount(group.blobCount)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-sm text-white tabular-nums">
                      {formatBlobSize(group.blobSizeBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {truncated && (
            <p className="mt-2 text-xs text-[#6e7687]">
              Based on the most recent {MEMPOOL_SAMPLE_LIMIT} pending blobs.
            </p>
          )}
        </DataStateWrapper>

        <div className="mt-10">
          <MempoolTable limit={MEMPOOL_SAMPLE_LIMIT} />
        </div>
      </section>
    </div>
  );
}
