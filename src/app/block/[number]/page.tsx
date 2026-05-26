"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DataStateWrapper from '@/components/DataStateWrapper';
import { BlobDetailsContent } from '@/components/BlobDetailsContent';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { useNetwork } from '@/hooks/useNetwork';
import { Block } from '@/types';
import { formatBlobFee, formatUtilizationPercent } from '@/utils';

function formatBaseFee(block: Block): string {
  if (!block.baseFeeGwei || block.baseFeeGwei === '0') return '-';
  return formatBlobFee(block.baseFeeGwei);
}

function formatOpenCapacity(block: Block): string {
  if (block.maxBlobs <= 0) return '-';
  return `${block.availableBlobs}/${block.maxBlobs} open`;
}

function formatUtilization(block: Block): string {
  if (block.maxBlobs <= 0) return '-';
  return formatUtilizationPercent(block.utilizationPercent);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
      <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl text-white font-medium">{value}</div>
    </div>
  );
}

export default function BlockDetailPage() {
  const params = useParams();
  const rawNumber = params.number as string;
  const blockNumber = Number(rawNumber);
  const isValidNumber = Number.isFinite(blockNumber) && blockNumber > 0;
  const { selectedNetwork } = useNetwork();

  const { data: block, isLoading, error } = useApiData<Block | null>(
    () =>
      isValidNumber
        ? api.getBlockByNumber(blockNumber, selectedNetwork.apiParam)
        : Promise.resolve(null),
    ['block-by-number', selectedNetwork.apiParam, rawNumber]
  );

  const loadingComponent = (
    <div className="space-y-6">
      <div className="h-8 bg-[#202538] rounded w-64 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
            <div className="h-3 bg-[#202538] rounded w-20 animate-pulse mb-2" />
            <div className="h-6 bg-[#202538] rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border border-divider rounded-lg p-6">
        <div className="h-5 bg-[#202538] rounded w-40 animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-[#202538] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background bg-grid-pattern bg-grid-size">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link
          href="/blocks"
          className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
        >
          <i className="fa-regular fa-arrow-left" aria-hidden="true" />
          Back to Blocks
        </Link>

        {!isValidNumber ? (
          <div className="rounded-lg border border-divider bg-[#161a29]/80 p-6">
            <h1 className="text-2xl font-windsor-bold text-white mb-2">Invalid block</h1>
            <p className="text-bodyText text-sm">
              &ldquo;{rawNumber}&rdquo; is not a valid block number.
            </p>
          </div>
        ) : (
          <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
            {block === null ? (
              <div className="rounded-lg border border-divider bg-[#161a29]/80 p-6">
                <h1 className="text-2xl font-windsor-bold text-white mb-2">
                  Block {blockNumber.toLocaleString()}
                </h1>
                <p className="text-bodyText text-sm mb-4">
                  This block isn&rsquo;t available in the latest indexed window for{' '}
                  {selectedNetwork.name}. It may be older than the indexer&rsquo;s retention.
                </p>
                <a
                  href={`https://etherscan.io/block/${blockNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue hover:underline text-sm inline-flex items-center gap-2"
                >
                  View on Etherscan
                  <i className="fa-regular fa-arrow-up-right-from-square text-xs" aria-hidden="true" />
                </a>
              </div>
            ) : block ? (
              <>
                <div className="mb-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                    <h1 className="text-3xl font-windsor-bold text-white">
                      Block {Number(block.number).toLocaleString()}
                    </h1>
                    {block.blockUrl && (
                      <a
                        href={block.blockUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue hover:underline text-sm inline-flex items-center gap-2"
                      >
                        View on Etherscan
                        <i
                          className="fa-regular fa-arrow-up-right-from-square text-xs"
                          aria-hidden="true"
                        />
                      </a>
                    )}
                  </div>
                  <p className="text-bodyText text-sm mb-6">
                    {block.timestamp}
                    {block.isFull && (
                      <span className="ml-3 text-[10px] uppercase tracking-wider text-[#ff8f8f]">
                        Full
                      </span>
                    )}
                    {!block.isFull && block.isAboveTarget && (
                      <span className="ml-3 text-[10px] uppercase tracking-wider text-[#ffb86b]">
                        Above target
                      </span>
                    )}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Blobs" value={block.blobCount.toLocaleString()} />
                    <StatCard label="Utilization" value={formatUtilization(block)} />
                    <StatCard label="Base Fee" value={formatBaseFee(block)} />
                    <StatCard label="Open Capacity" value={formatOpenCapacity(block)} />
                  </div>
                </div>

                <section>
                  <h2 className="text-2xl font-windsor-bold text-white mb-4">Blobs</h2>
                  <div className="border border-divider rounded-lg bg-[#0f1322]">
                    <BlobDetailsContent block={block} />
                  </div>
                </section>
              </>
            ) : null}
          </DataStateWrapper>
        )}
      </div>
      <Footer />
    </main>
  );
}
