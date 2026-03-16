"use client";

import React from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../lib/api';
import { Block, LatestBlocksResponse } from '../types';
import DataStateWrapper from './DataStateWrapper';
import { useNetwork } from '../hooks/useNetwork';

export default function LatestBlocksTable() {
  const { selectedNetwork } = useNetwork();

  const { data, isLoading, error } = useApiData<LatestBlocksResponse>(
    () => api.getLatestBlocks(20, selectedNetwork.apiParam)
  );

  // Loading state for the table
  const loadingComponent = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/5">Block</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">Blobs</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4 whitespace-nowrap">Time</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-2/5">Attribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-24 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-8 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
                <div className="h-5 bg-[#202538] rounded w-20 animate-pulse"></div>
              </td>
              <td className="py-3 px-6">
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
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/5">Block</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/6">Blobs</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-1/4 whitespace-nowrap">Time</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-2/5">Attribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((block: Block) => (
                  <tr key={block.id} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-white">{block.number}</td>
                    <td className="py-3 px-6 text-sm text-white">{block.blobCount}</td>
                    <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{block.timestamp}</td>
                    <td className="py-3 px-6 text-sm text-white">
                      {block.attribution.length === 1 ? (
                        <div className="flex items-center">
                          <img
                            src={`/images/${block.attribution[0].toLowerCase()}.png`}
                            alt={block.attribution[0]}
                            className="inline-block w-5 h-5 mr-2"
                          />
                          <span className="whitespace-nowrap">{block.attribution[0]}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {block.attribution.map((attr, idx) => (
                              <img
                                key={idx}
                                src={`/images/${attr.toLowerCase()}.png`}
                                alt={attr}
                                className="inline-block w-5 h-5 rounded-full ring-1 ring-gray-800 min-w-[1.25rem] min-h-[1.25rem]"
                                title={attr}
                              />
                            ))}
                          </div>
                          <span className="whitespace-nowrap text-sm text-white ml-6">
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
