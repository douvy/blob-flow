"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from '@/components/NetworkLink';
import AttributionBadge from '@/components/AttributionBadge';
import BlobTable, { BlobTableSkeleton } from '@/components/BlobTable';
import DataStateWrapper from '@/components/DataStateWrapper';
import PendingBlobsSection from '@/components/PendingBlobsSection';
import { RelativeTime } from '@/components/RelativeTime';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { BlobResponse, EntityDetail as EntityDetailData } from '@/types';
import {
  formatCostEthOrWei,
  formatNumber,
  networkPath,
  truncateAddress,
} from '@/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Skeleton } from './ui/skeleton';

// Overrides the table primitives' px-6, which is too wide for phone columns.
const CELL_PADDING = 'px-2 sm:px-6';

const ENTITY_BLOB_LIMIT = 20;

// On phones only the address and blob count fit; spend and last activity
// join at md, matching the users leaderboard's breakpoints.
const COLUMN_WIDTHS = {
  address: 'w-[55%] md:w-[40%]',
  dataCount: 'w-[45%] md:w-[24%]',
  totalCost: 'hidden md:table-cell md:w-[20%]',
  lastActive: 'hidden md:table-cell md:w-[16%]',
};

/**
 * One attributed entity aggregated across every sender address the registry
 * maps to it, with a per-address breakdown. This is the entity-first
 * counterpart to /user/[address]: leaderboards and search link here, and each
 * address row drills down to its address page.
 */
export default function EntityDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const { selectedNetwork } = useNetwork();

  // Null means the slug resolved and no attributed entity matches it on the
  // selected network; undefined means it is still loading.
  const { data: entity, isLoading, error } = useApiData<EntityDetailData | null>(
    () => api.getEntityBySlug(slug, selectedNetwork.apiParam),
    ['entity', selectedNetwork.apiParam, slug]
  );
  const entityNotFound = entity === null;

  // The merged lists fan out one request per address (the blob endpoints
  // filter by a single sender), so each candidate set stays as small as
  // correctness allows. Confirmed history can only come from addresses with
  // indexed activity; pending blobs only from the entity's current
  // (in-registry) operators. A retired address's new pending transactions
  // are deliberately not shown here: the registry no longer attributes that
  // address to this entity, so surfacing them would misattribute activity.
  const activeAddresses = React.useMemo(
    () =>
      (entity?.addresses ?? [])
        .filter((address) => address.dataCount > 0)
        .map((address) => address.address),
    [entity]
  );
  const mempoolAddresses = React.useMemo(
    () =>
      (entity?.addresses ?? [])
        .filter((address) => address.inRegistry)
        .map((address) => address.address),
    [entity]
  );

  const { data: confirmedBlobs, isLoading: blobsLoading, error: blobsError } = useApiData<BlobResponse[]>(
    () => api.getEntityBlobs(activeAddresses, true, ENTITY_BLOB_LIMIT, selectedNetwork.apiParam),
    ['entity-blobs', selectedNetwork.apiParam, slug, 'confirmed', activeAddresses.join(',')],
    { enabled: Boolean(entity) }
  );

  const { data: mempoolBlobs, isLoading: mempoolLoading, error: mempoolError } = useApiData<BlobResponse[]>(
    () => api.getEntityBlobs(mempoolAddresses, false, ENTITY_BLOB_LIMIT, selectedNetwork.apiParam),
    ['entity-blobs', selectedNetwork.apiParam, slug, 'mempool', mempoolAddresses.join(',')],
    { enabled: Boolean(entity) }
  );

  const goToAddress = React.useCallback(
    (address: string) => {
      router.push(networkPath(`/user/${address}`, selectedNetwork.apiParam));
    },
    [router, selectedNetwork.apiParam]
  );

  const handleRowKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, address: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToAddress(address);
      }
    },
    [goToAddress]
  );

  const loadingComponent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-divider">
        <Table className="min-w-full table-fixed overflow-hidden">
          <TableBody className="divide-y divide-divider">
            {[...Array(3)].map((_, index) => (
              <TableRow key={index} className="bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                <TableCell className={CELL_PADDING}>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell className={CELL_PADDING}>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link
        href="/users"
        className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Top Blob Users
      </Link>

      <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
        {entityNotFound && (
          <div className="rounded-lg border border-divider bg-[#14161a] p-6">
            <h1 className="text-2xl font-windsor-bold text-white mb-2">Entity not found</h1>
            <p className="text-bodyText text-sm">
              No attributed entity matches this page on {selectedNetwork.name}. It may be
              named differently in the attribution registry, or only active on another
              network.
            </p>
          </div>
        )}
        {entity && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <AttributionBadge
                user={entity.name}
                sizeClass="w-8 h-8"
                textClass="text-sm"
                px={32}
              />
              <h1 className="text-3xl font-windsor-bold text-white">{entity.name}</h1>
            </div>
            <p className="text-sm text-bodyText mb-6">
              Totals across {entity.addresses.length === 1
                ? 'the one address'
                : `all ${entity.addresses.length} addresses`}{' '}
              attributed to {entity.name} on {selectedNetwork.name}
              {entity.blobSharePercent > 0
                ? `, ${Math.round(entity.blobSharePercent * 10) / 10}% of all blobs posted.`
                : '.'}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Blob Count</div>
                <div className="text-xl text-white font-medium">
                  {formatNumber(entity.totalDataCount)}
                </div>
              </div>
              <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Total Cost</div>
                <div className="text-xl text-white font-medium">
                  {formatCostEthOrWei(entity.totalCostWei)}
                </div>
              </div>
              <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Last Active</div>
                <div className="text-xl text-white font-medium">
                  {entity.lastTimestamp ? <RelativeTime timestamp={entity.lastTimestamp} /> : '-'}
                </div>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-windsor-bold text-white mb-4">Addresses</h2>
              {entity.addresses.length === 0 ? (
                <div className="text-center py-8 border border-divider rounded-lg bg-gradient-to-r from-[#17181b] to-[#141519]/60">
                  <p className="text-[#6c727f]">
                    No indexed blob activity on {selectedNetwork.name}.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-divider">
                  <Table className="min-w-full table-fixed overflow-hidden">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-b from-[#22252c] to-[#16171b]">
                        <TableHead className={`${CELL_PADDING} ${COLUMN_WIDTHS.address}`}>
                          Address
                        </TableHead>
                        <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.dataCount}`}>
                          Blobs
                        </TableHead>
                        <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.totalCost}`}>
                          Total Cost
                        </TableHead>
                        <TableHead className={`whitespace-nowrap ${CELL_PADDING} ${COLUMN_WIDTHS.lastActive}`}>
                          Last Active
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-divider">
                      {entity.addresses.map((addressStats) => (
                        <TableRow
                          key={addressStats.address}
                          className="group cursor-pointer bg-gradient-to-r from-[#17181b] to-[#141519]/60 hover:bg-gradient-to-r hover:from-[#1f2127]/70 hover:to-[#23252b]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
                          onClick={() => goToAddress(addressStats.address)}
                          onKeyDown={(event) => handleRowKeyDown(event, addressStats.address)}
                          tabIndex={0}
                          role="link"
                          aria-label={`View activity for ${addressStats.address}`}
                        >
                          <TableCell
                            className={`whitespace-nowrap text-sm text-white ${CELL_PADDING} ${COLUMN_WIDTHS.address}`}
                            title={addressStats.address}
                          >
                            {/* The whole row is the link target, so the address
                                carries the affordance for it: the same blue the
                                rest of the app gives address links, underlined
                                whenever the row is hovered or focused. */}
                            <span className="font-mono text-blue underline-offset-2 group-hover:underline group-focus-visible:underline">
                              {truncateAddress(addressStats.address)}
                            </span>
                            {!addressStats.inRegistry && (
                              <span className="ml-2 rounded-full border border-divider px-2 py-0.5 text-xs text-[#8a93a5]">
                                retired
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`whitespace-nowrap text-sm text-white tabular-nums ${CELL_PADDING} ${COLUMN_WIDTHS.dataCount}`}
                          >
                            {formatNumber(addressStats.dataCount)}
                          </TableCell>
                          <TableCell
                            className={`whitespace-nowrap text-sm text-white tabular-nums ${CELL_PADDING} ${COLUMN_WIDTHS.totalCost}`}
                          >
                            {formatCostEthOrWei(addressStats.totalCostWei || addressStats.totalCostEth)}
                          </TableCell>
                          <TableCell
                            className={`whitespace-nowrap text-sm text-white ${CELL_PADDING} ${COLUMN_WIDTHS.lastActive}`}
                          >
                            {addressStats.lastTimestamp ? (
                              <RelativeTime timestamp={addressStats.lastTimestamp} />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <PendingBlobsSection
              blobs={mempoolBlobs}
              isLoading={mempoolLoading}
              error={mempoolError}
              limit={ENTITY_BLOB_LIMIT}
              showFrom
            />

            <section className="mb-8">
              <h2 className="text-2xl font-windsor-bold text-white mb-4">Recent Blobs</h2>
              <DataStateWrapper isLoading={blobsLoading} error={blobsError} loadingComponent={<BlobTableSkeleton />}>
                {confirmedBlobs && <BlobTable blobs={confirmedBlobs} showBlock={true} showFrom />}
              </DataStateWrapper>
            </section>
          </div>
        )}
      </DataStateWrapper>
    </div>
  );
}
