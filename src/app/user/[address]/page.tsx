"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DataStateWrapper from '@/components/DataStateWrapper';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { useNetwork } from '@/hooks/useNetwork';
import { UserResponse, BlobResponse } from '@/types';
import { formatWeiToReadable, truncateAddress } from '@/utils';
import { formatRelativeTime } from '@/lib/api/core';

function BlobTable({ blobs, showBlock }: { blobs: BlobResponse[]; showBlock: boolean }) {
  const truncateTxHash = (hash: string): string => {
    if (hash.length <= 14) return hash;
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 4)}`;
  };

  if (blobs.length === 0) {
    return (
      <div className="text-center py-8 border border-divider rounded-lg bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
        <p className="text-[#6c727f]">No blobs found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[30%]">Tx Hash</th>
            {showBlock && (
              <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Block</th>
            )}
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[15%]">Size</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[20%]">Cost</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider w-[20%]">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {blobs.map((blob) => (
            <tr key={`${blob.tx_hash}-${blob.blob_index}`} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60 hover:bg-gradient-to-r hover:from-[#202538]/70 hover:to-[#242731]/70 transition-colors">
              <td className="py-3 px-6 text-sm font-mono text-white">{truncateTxHash(blob.tx_hash)}</td>
              {showBlock && (
                <td className="py-3 px-6 text-sm text-white">{blob.block_number}</td>
              )}
              <td className="py-3 px-6 text-sm text-white whitespace-nowrap">
                {blob.blob_size_bytes > 0 ? `${(blob.blob_size_bytes / 1024).toFixed(1)} KB` : '-'}
              </td>
              <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{formatWeiToReadable(blob.total_cost_eth)}</td>
              <td className="py-3 px-6 text-sm text-white whitespace-nowrap">{formatRelativeTime(blob.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { selectedNetwork } = useNetwork();

  const { data: user, isLoading: userLoading, error: userError } = useApiData<UserResponse>(
    () => api.getUserByAddress(address, selectedNetwork.apiParam)
  );

  const { data: confirmedBlobs, isLoading: blobsLoading, error: blobsError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, true, 20, selectedNetwork.apiParam)
  );

  const { data: mempoolBlobs, isLoading: mempoolLoading, error: mempoolError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, false, 20, selectedNetwork.apiParam)
  );

  const userName = user?.name || truncateAddress(address);

  const loadingStats = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#202538] animate-pulse" />
        <div className="h-8 bg-[#202538] rounded w-40 animate-pulse" />
      </div>
      <div className="h-5 bg-[#202538] rounded w-80 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
            <div className="h-3 bg-[#202538] rounded w-16 animate-pulse mb-2" />
            <div className="h-6 bg-[#202538] rounded w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  const loadingTable = (
    <div className="overflow-x-auto border border-divider rounded-lg">
      <table className="min-w-full overflow-hidden table-fixed">
        <thead>
          <tr className="border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b]">
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Tx Hash</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Block</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Size</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Cost</th>
            <th className="py-3 px-6 text-left text-xs font-medium text-[#6e7787] uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="bg-gradient-to-r from-[#161a29] to-[#19191e]/60">
              <td className="py-3 px-6"><div className="h-5 bg-[#202538] rounded w-28 animate-pulse" /></td>
              <td className="py-3 px-6"><div className="h-5 bg-[#202538] rounded w-16 animate-pulse" /></td>
              <td className="py-3 px-6"><div className="h-5 bg-[#202538] rounded w-14 animate-pulse" /></td>
              <td className="py-3 px-6"><div className="h-5 bg-[#202538] rounded w-20 animate-pulse" /></td>
              <td className="py-3 px-6"><div className="h-5 bg-[#202538] rounded w-16 animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back link */}
        <Link href="/" className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2">
          <i className="fa-regular fa-arrow-left" aria-hidden="true" />
          Back to Dashboard
        </Link>

        {/* User header */}
        <DataStateWrapper isLoading={userLoading} error={userError} loadingComponent={loadingStats}>
          {user && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                {user.name && !user.name.includes('...') ? (
                  <img src={`/images/${user.name.toLowerCase()}.png`} alt={user.name} className="w-8 h-8" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-500 inline-block" />
                )}
                <h1 className="text-3xl font-windsor-bold text-white">{userName}</h1>
              </div>
              <p className="text-bodyText font-mono text-sm mb-6">{address}</p>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Blob Count</div>
                  <div className="text-xl text-white font-medium">{user.blob_count.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Total Cost</div>
                  <div className="text-xl text-white font-medium">{formatWeiToReadable(user.total_cost_eth)}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Last Active</div>
                  <div className="text-xl text-white font-medium">{formatRelativeTime(user.last_timestamp)}</div>
                </div>
              </div>
            </div>
          )}
        </DataStateWrapper>

        {/* Recent confirmed blobs */}
        <section className="mb-8">
          <h2 className="text-2xl font-windsor-bold text-white mb-4">Recent Blobs</h2>
          <DataStateWrapper isLoading={blobsLoading} error={blobsError} loadingComponent={loadingTable}>
            {confirmedBlobs && <BlobTable blobs={confirmedBlobs} showBlock={true} />}
          </DataStateWrapper>
        </section>

        {/* Mempool blobs */}
        <section className="mb-8">
          <h2 className="text-2xl font-windsor-bold text-white mb-4">Pending Blobs</h2>
          <DataStateWrapper isLoading={mempoolLoading} error={mempoolError} loadingComponent={loadingTable}>
            {mempoolBlobs && <BlobTable blobs={mempoolBlobs} showBlock={false} />}
          </DataStateWrapper>
        </section>
      </div>
      <Footer />
    </main>
  );
}
