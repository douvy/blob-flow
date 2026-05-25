"use client";

import React from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { Block, LatestBlocksResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';
import {
  formatBlobCount,
  formatGwei,
  formatNumber,
  formatUtilizationPercent,
  getNetworkIconSrc,
} from '../utils';

function AttributionBadge({ attribution }: { attribution: string }) {
  const iconSrc = getNetworkIconSrc(attribution);

  return (
    <span className="inline-flex items-center min-w-0">
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={attribution}
          className="inline-block w-5 h-5 mr-2 shrink-0"
        />
      ) : (
        <span className="inline-block w-5 h-5 rounded-full mr-2 bg-gray-500 shrink-0" />
      )}
      <span className="truncate">{attribution}</span>
    </span>
  );
}

export default function LatestBlocksTable() {
  const { selectedNetwork } = useNetwork();
  const fetchLatestBlocks = React.useCallback(
    () => api.getLatestBlocks(20, selectedNetwork.apiParam),
    [selectedNetwork.apiParam]
  );

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    fetchLatestBlocks
  );

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[28%]">Block</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[18%]">Blobs</th>
            <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[26%]">Util.</th>
            <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Base Fee</th>
            <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Users</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse mb-2"></div>
                <div className="h-3 bg-[#202538] rounded w-16 animate-pulse sm:hidden"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-12 animate-pulse mb-2"></div>
                <div className="h-2 bg-[#202538] rounded w-24 animate-pulse"></div>
              </td>
              <td className="hidden sm:table-cell py-3 px-3 sm:px-4">
                <div className="h-5 bg-[#202538] rounded w-16 animate-pulse"></div>
              </td>
              <td className="hidden lg:table-cell py-3 px-3 sm:px-4">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, idx) => (
                      <div
                        key={idx}
                        className="inline-block w-5 h-5 rounded-full bg-[#202538] animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Latest Blocks</h2>

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
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[28%]">Block</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[18%]">Blobs</th>
                  <th className="py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[26%]">Util.</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[16%] whitespace-nowrap">Base Fee</th>
                  <th className="hidden lg:table-cell py-3 px-3 sm:px-4 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[12%]">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((block: Block) => (
                  <tr key={block.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                    <td className="py-3 px-3 sm:px-4 text-sm font-medium text-white">
                      {block.blockUrl ? (
                        <a
                          href={block.blockUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue hover:underline"
                        >
                          {formatNumber(Number(block.number))}
                        </a>
                      ) : (
                        <span>{formatNumber(Number(block.number))}</span>
                      )}
                      <div className="text-xs text-[#8a93a5] mt-1 font-normal whitespace-nowrap">{block.timestamp}</div>
                      <div className="text-xs text-[#8a93a5] mt-1 font-normal sm:hidden">{formatGwei(block.baseFeeGwei)}</div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-white">
                      <div className="whitespace-nowrap">{formatBlobCount(block.blobCount)}</div>
                      <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">{block.availableBlobs}/{block.maxBlobs} open</div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-sm text-white">
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap">{formatUtilizationPercent(block.utilizationPercent)}</span>
                        {block.isFull && (
                          <span className="text-[10px] uppercase tracking-wider text-[#ff8f8f]">Full</span>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[#2a2f37] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${block.isAboveTarget ? 'bg-[#ffb86b]' : 'bg-blue'}`}
                          style={{ width: `${Math.min(block.utilizationPercent, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-[#8a93a5] mt-1 whitespace-nowrap">target {block.targetBlobs}</div>
                    </td>
                    <td className="hidden sm:table-cell py-3 px-3 sm:px-4 text-sm text-white whitespace-nowrap">{formatGwei(block.baseFeeGwei)}</td>
                    <td className="hidden lg:table-cell py-3 px-3 sm:px-4 text-sm text-white">
                      {block.attribution.length === 1 ? (
                        <AttributionBadge attribution={block.attribution[0]} />
                      ) : (
                        <div className="flex items-center min-w-0">
                          <div className="flex -space-x-2">
                            {block.attribution.map((attr, idx) => {
                              const iconSrc = getNetworkIconSrc(attr);

                              return iconSrc ? (
                                <img
                                  key={attr}
                                  src={iconSrc}
                                  alt={attr}
                                  className="inline-block w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-[1.25rem] min-h-[1.25rem]"
                                  title={attr}
                                />
                              ) : (
                                <span
                                  key={`${attr}-${idx}`}
                                  className="inline-block w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-[1.25rem] min-h-[1.25rem] bg-gray-500"
                                  title={attr}
                                />
                              );
                            })}
                          </div>
                          <span className="whitespace-nowrap text-sm text-white ml-5">
                            {block.attribution.length} networks
                          </span>
                        </div>
                      )}
                    </td>
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
