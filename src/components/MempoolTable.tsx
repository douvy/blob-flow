"use client";

import React from 'react';
import { usePaginatedApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { MempoolResponse, MempoolTransaction } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';

export default function MempoolTable() {
  const { selectedNetwork } = useNetwork();

  // Fetch mempool data with pagination
  const {
    data,
    isLoading,
    error,
  } = usePaginatedApiData<MempoolResponse>(
    (page, limit, network) => api.getMempool(page, limit, network),
    [selectedNetwork],
    selectedNetwork.apiParam
  );

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
        isLoading={isLoading}
        error={error}
        loadingComponent={loadingComponent}
      >
        {data && (
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
                {data.data.map((tx: MempoolTransaction) => (
                  <tr key={tx.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                    <td className="py-3 px-6 text-sm font-mono text-white">{truncateTxHash(tx.txHash)}</td>
                    <td className="py-3 px-6 text-sm font-mono text-white">{tx.fromAddress}</td>
                    <td className="py-3 px-6 text-sm text-white">
                      {tx.user ? (
                        <div className="flex items-center">
                          <img
                            src={`/images/${tx.user.toLowerCase()}.png`}
                            alt={tx.user}
                            className="inline-block w-5 h-5 mr-3"
                          />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
