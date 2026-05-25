"use client";

import React from 'react';
import Image from 'next/image';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { MempoolResponse, MempoolTransaction } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { getAttributionImageSrc, getAttributionInitial } from '../utils';
import { useBlobWebSocket } from '../contexts/LiveDataContext';
import { transformBlobToMempoolTransaction } from '../lib/api/mempool';
import MempoolBlobDetailsModal from './MempoolBlobDetailsModal';

export default function MempoolTable() {
  const { selectedNetwork } = useNetwork();
  const { latestEvents } = useBlobWebSocket();
  const [selectedTransaction, setSelectedTransaction] = React.useState<MempoolTransaction | null>(null);

  const { data, isLoading, error } = useApiData<MempoolResponse>(
    () => api.getMempool(10, selectedNetwork.apiParam),
    undefined,
    selectedNetwork.apiParam
  );
  const displayData = React.useMemo<MempoolResponse | undefined>(() => {
    const liveEvent = latestEvents.mempool_update;
    if (!liveEvent) {
      return data;
    }

    if (liveEvent.data.action === 'remove') {
      return {
        data: (data?.data || [])
          .filter((tx) => tx.txHash !== liveEvent.data.blob.tx_hash)
          .map((tx, index) => ({ ...tx, id: index + 1 })),
      };
    }

    const liveTransaction = transformBlobToMempoolTransaction(liveEvent.data.blob, 0);
    return {
      data: [
        liveTransaction,
        ...(data?.data || []).filter((tx) => tx.txHash !== liveTransaction.txHash),
      ]
        .slice(0, 10)
        .map((tx, index) => ({ ...tx, id: index + 1 })),
    };
  }, [data, latestEvents.mempool_update]);

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[24%]">TX Hash</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">From</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">User</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%] whitespace-nowrap">Count</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Est. Cost</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[14%] whitespace-nowrap">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-24 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="flex items-center">
                  <div className="inline-block w-5 h-5 rounded-full bg-[#202538] animate-pulse mr-3"></div>
                  <div className="h-5 bg-[#202538] rounded w-16 animate-pulse"></div>
                </div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-12 animate-pulse"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Function to truncate transaction hash for display
  const truncateTxHash = (hash: string): string => {
    if (hash.length <= 10) return hash;
    return `${hash.substring(0, 8)}...`;
  };

  return (
    <section className="pt-2">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Mempool Attribution</h2>

      <DataStateWrapper
        isLoading={isLoading && !displayData}
        error={displayData ? null : error}
        loadingComponent={loadingComponent}
      >
        {displayData && (
          <div className="overflow-x-auto border border-divider rounded-lg">
            <table className="min-w-full overflow-hidden table-fixed">
              <thead>
                <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[24%]">TX Hash</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">From</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">User</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%] whitespace-nowrap">Count</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Est. Cost</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[14%] whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {displayData.data.map((tx: MempoolTransaction) => {
                  const userImageSrc = tx.user ? getAttributionImageSrc(tx.user) : null;

                  return (
                    <tr key={`${tx.txHash}-${tx.rawBlob.blob_index}`} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                      <td className="py-3 px-6 text-sm font-mono text-white">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(tx)}
                          className="cursor-pointer rounded text-left text-white underline decoration-[#3B55E6]/50 underline-offset-4 transition-colors hover:text-[#9ac4fd] focus:outline-none focus:ring-2 focus:ring-[#3B55E6] focus:ring-offset-2 focus:ring-offset-[#161a29]"
                          aria-label={`View pending blob details for transaction ${tx.txHash}`}
                        >
                          {truncateTxHash(tx.txHash)}
                        </button>
                      </td>
                      <td className="py-3 px-6 text-sm font-mono text-white">{tx.fromAddress}</td>
                      <td className="py-3 px-6 text-sm text-white">
                        {tx.user ? (
                          <div className="flex items-center">
                            {userImageSrc ? (
                              <Image
                                src={userImageSrc}
                                alt={tx.user}
                                width={20}
                                height={20}
                                className="inline-block w-5 h-5 mr-3"
                              />
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-3 bg-gray-500 text-[10px] text-white font-medium">
                                {getAttributionInitial(tx.user)}
                              </span>
                            )}
                            {tx.user}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="inline-block w-5 h-5 rounded-full mr-3 bg-gray-500"></span>
                            <span className="text-white">Unknown</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.blobCount}</td>
                      <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.estimatedCost}</td>
                      <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{tx.timeInMempool}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
      <MempoolBlobDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </section>
  );
}
