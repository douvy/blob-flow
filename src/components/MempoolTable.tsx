"use client";

import React from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { MempoolResponse, MempoolTransaction } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import { formatBlobCount, formatBlobSize, getNetworkIconSrc } from '../utils';

export default function MempoolTable() {
  const { selectedNetwork } = useNetwork();
  const fetchMempool = React.useCallback(
    () => api.getMempool(10, selectedNetwork.apiParam),
    [selectedNetwork.apiParam]
  );

  const { data, isLoading, error } = useApiData<MempoolResponse>(
    fetchMempool
  );

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">TX Hash</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">Sender</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Blobs</th>
            <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Fee Cap</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">Cost</th>
            <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%] whitespace-nowrap">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-24 animate-pulse mb-2"></div>
                <div className="h-3 bg-[#202538] rounded w-14 animate-pulse md:hidden"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="hidden sm:table-cell py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-16 animate-pulse"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="hidden md:table-cell py-3 px-3 sm:px-4">
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
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">TX Hash</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[22%]">Sender</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Blobs</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Fee Cap</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%]">Cost</th>
                  <th className="hidden md:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%] whitespace-nowrap">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((tx: MempoolTransaction) => {
                  const iconSrc = getNetworkIconSrc(tx.user);

                  return (
                    <tr key={tx.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                      <td className="py-3 px-3 sm:px-4 text-sm font-mono text-white">
                        {tx.transactionUrl ? (
                          <a
                            href={tx.transactionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue hover:underline"
                          >
                            {truncateTxHash(tx.txHash)}
                          </a>
                        ) : (
                          <span>{truncateTxHash(tx.txHash)}</span>
                        )}
                        <div className="text-xs text-[#8a93a5] mt-1 font-sans md:hidden">{tx.timeInMempool}</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-sm text-white min-w-0">
                        <div className="font-mono whitespace-nowrap">
                          {tx.fromAddressUrl ? (
                            <a
                              href={tx.fromAddressUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue hover:underline"
                              title={tx.fromAddressFull}
                            >
                              {tx.fromAddress}
                            </a>
                          ) : (
                            <span title={tx.fromAddressFull}>{tx.fromAddress}</span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-[#8a93a5] mt-1 min-w-0">
                          {iconSrc ? (
                            <img src={iconSrc} alt={tx.user || 'Unknown'} className="inline-block w-4 h-4 mr-2 shrink-0" />
                          ) : (
                            <span className="inline-block w-4 h-4 rounded-full mr-2 bg-gray-500 shrink-0" />
                          )}
                          <span className="truncate">{tx.user || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-sm text-white">
                        <div className="whitespace-nowrap">{formatBlobCount(tx.blobCount)}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">{formatBlobSize(tx.blobSizeBytes)}</div>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-3 sm:px-4 text-sm text-white">
                        <div className="whitespace-nowrap">{tx.maxFeeGwei}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">{tx.feeHeadroom} room</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-sm text-white">
                        <div className="whitespace-nowrap">{tx.realizedCost}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">max {tx.maxCost}</div>
                        <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap sm:hidden">{tx.feeHeadroom} room</div>
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">{tx.timeInMempool}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataStateWrapper>
    </section>
  );
}
