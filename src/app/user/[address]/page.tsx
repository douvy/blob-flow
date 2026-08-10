"use client";

import { useParams } from 'next/navigation';
import Link from '@/components/NetworkLink';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import BlobTable, { BlobTableSkeleton } from '@/components/BlobTable';
import DataStateWrapper from '@/components/DataStateWrapper';
import PendingBlobsSection from '@/components/PendingBlobsSection';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { useNetwork } from '@/hooks/useNetwork';
import { UserResponse, BlobResponse } from '@/types';
import {
  formatCostEthOrWei,
  getAttributionSuggestionUrl,
  safeExplorerUrl,
  truncateAddress,
} from '@/utils';
import { RelativeTime } from '@/components/RelativeTime';
import AttributionBadge from '@/components/AttributionBadge';
import { entityPagePath } from '@/lib/entityLink';
import { ATTRIBUTION_CONTRIBUTING_URL } from '@/constants';

const USER_BLOB_LIMIT = 20;

export default function UserDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { selectedNetwork } = useNetwork();

  // Null means the lookup settled and the address has no indexed activity on
  // the selected network (common right after switching networks on this page);
  // undefined means it is still loading.
  const { data: user, isLoading: userLoading, error: userError } = useApiData<UserResponse | null>(
    () => api.getUserByAddress(address, selectedNetwork.apiParam),
    ['user', selectedNetwork.apiParam, address]
  );
  const userNotFound = user === null;

  const { data: confirmedBlobs, isLoading: blobsLoading, error: blobsError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, true, USER_BLOB_LIMIT, selectedNetwork.apiParam),
    ['user-blobs', selectedNetwork.apiParam, address, 'confirmed', USER_BLOB_LIMIT]
  );

  const { data: mempoolBlobs, isLoading: mempoolLoading, error: mempoolError } = useApiData<BlobResponse[]>(
    () => api.getUserBlobs(address, false, USER_BLOB_LIMIT, selectedNetwork.apiParam),
    ['user-blobs', selectedNetwork.apiParam, address, 'mempool', USER_BLOB_LIMIT]
  );

  const userName = user?.name || truncateAddress(address);
  const entityHref = user?.name ? entityPagePath(user.name) : null;
  // Null when the route param is not a parseable address; the callout then
  // only links to the contribution guide instead of a prefilled file.
  const attributionSuggestionUrl = getAttributionSuggestionUrl(
    address,
    selectedNetwork.apiParam
  );

  // The backend user endpoint carries no explorer link, but every blob from
  // this address shares one, so surface it from whichever list has loaded.
  // Validated via safeExplorerUrl to avoid rendering non-http(s) hrefs.
  const explorerUrl =
    safeExplorerUrl(
      confirmedBlobs?.find((blob) => blob.from_address_url)?.from_address_url ||
        mempoolBlobs?.find((blob) => blob.from_address_url)?.from_address_url
    ) ?? null;

  const loadingStats = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#26282e] animate-pulse" />
        <div className="h-8 bg-[#26282e] rounded w-40 animate-pulse" />
      </div>
      <div className="h-5 bg-[#26282e] rounded w-80 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
            <div className="h-3 bg-[#26282e] rounded w-16 animate-pulse mb-2" />
            <div className="h-6 bg-[#26282e] rounded w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link href="/" className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>

        <DataStateWrapper isLoading={userLoading} error={userError} loadingComponent={loadingStats}>
          {userNotFound && (
            <div className="rounded-lg border border-divider bg-[#14161a] p-6">
              <h1 className="text-2xl font-windsor-bold text-white mb-2">
                {truncateAddress(address)}
              </h1>
              <p className="text-bodyText font-mono text-sm break-all mb-4">{address}</p>
              <p className="text-bodyText text-sm">
                No activity found for this address on {selectedNetwork.name}.
                It may be active on a different network.
              </p>
            </div>
          )}
          {user && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <AttributionBadge
                  user={userName}
                  sizeClass="w-8 h-8"
                  textClass="text-sm"
                  px={32}
                />
                <h1 className="text-3xl font-windsor-bold text-white">{userName}</h1>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-bodyText font-mono text-sm break-all">{address}</p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue hover:underline text-sm shrink-0"
                      aria-label="View address on block explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Explorer
                    </a>
                  )}
                </div>
                {/* The stats below cover this address only; an attributed
                    entity may post from several, so point at the entity page
                    for the aggregated view. */}
                {entityHref && (
                  <p className="text-sm text-bodyText mt-2">
                    One of the addresses attributed to {user.name}.{' '}
                    <Link href={entityHref} className="text-blue hover:underline">
                      View all {user.name} addresses
                    </Link>
                  </p>
                )}
              </div>

              {!user.name && (
                <div className="mb-6 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 p-4">
                  <p className="text-sm text-bodyText">
                    This address isn&apos;t attributed to a known entity yet. If you know
                    which project it belongs to, you can add it to the public blob-list
                    registry.
                    {attributionSuggestionUrl &&
                      ' The suggestion link opens a prefilled entity file on GitHub; committing it starts a pull request.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {attributionSuggestionUrl && (
                      <a
                        href={attributionSuggestionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue hover:underline text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Suggest an attribution
                      </a>
                    )}
                    <a
                      href={ATTRIBUTION_CONTRIBUTING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue hover:underline text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      How attribution works
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Blob Count</div>
                  <div className="text-xl text-white font-medium">{user.blob_count.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Total Cost</div>
                  <div className="text-xl text-white font-medium">{formatCostEthOrWei(user.total_cost_wei || user.total_cost_eth)}</div>
                </div>
                <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
                  <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">Last Active</div>
                  <div className="text-xl text-white font-medium"><RelativeTime timestamp={user.last_timestamp} /></div>
                </div>
              </div>
            </div>
          )}
        </DataStateWrapper>

        {!userNotFound && (
          <>
            <PendingBlobsSection
              blobs={mempoolBlobs}
              isLoading={mempoolLoading}
              error={mempoolError}
              limit={USER_BLOB_LIMIT}
            />

            <section className="mb-8">
              <h2 className="text-2xl font-windsor-bold text-white mb-4">Recent Blobs</h2>
              <DataStateWrapper isLoading={blobsLoading} error={blobsError} loadingComponent={<BlobTableSkeleton />}>
                {confirmedBlobs && <BlobTable blobs={confirmedBlobs} showBlock={true} />}
              </DataStateWrapper>
            </section>
          </>
        )}
    </div>
  );
}
