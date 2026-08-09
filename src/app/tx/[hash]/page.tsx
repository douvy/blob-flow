"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/NetworkLink';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import AttributionBadge from '@/components/AttributionBadge';
import CopyButton from '@/components/CopyButton';
import DataStateWrapper from '@/components/DataStateWrapper';
import RawBlobActions from '@/components/RawBlobActions';
import RawBlobViewer from '@/components/RawBlobViewer';
import StatCard from '@/components/StatCard';
import { RelativeTime } from '@/components/RelativeTime';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { useRawBlobAvailability } from '@/hooks/useRawBlobAvailability';
import { api } from '@/lib/api';
import { BlobResponse, BlobTransaction } from '@/types';
import {
  beaconSlotForBlob,
  costToWei,
  explorerHostLabel,
  explorerTxUrl,
  formatBlobCount,
  formatBlobFee,
  formatBlobSize,
  formatBlobWeiCost,
  formatFeeHeadroom,
  formatLocalTimestamp,
  safeExplorerUrl,
  truncateAddress,
  truncateTxHash,
} from '@/utils';
import { FEE_HEADROOM_TOOLTIP, SECONDS_PER_BLOCK } from '@/constants';

const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/i;

/** A blob's raw bytes are reachable when it has a versioned hash and a slot. */
function canViewRawBlob(blob: BlobResponse): boolean {
  return Boolean(blob.versioned_hash && beaconSlotForBlob(blob) !== null);
}

/**
 * Total of a cost field across a transaction's blob rows. Each row carries
 * its own blob's gas, size and cost, so transaction-level costs are sums, not
 * any single row's value. A row missing the field voids the total (undefined,
 * rendered as "-") rather than yielding an exact-looking undercount.
 */
function sumCostWei(values: Array<string | undefined>): string | undefined {
  let total = BigInt(0);

  for (const value of values) {
    const wei = costToWei(value);
    if (wei === null) return undefined;
    total += wei;
  }

  return total.toString();
}

/**
 * How many blobs the transaction carries. The row's versioned hash list covers
 * the whole transaction, so it still gives the true count when only some of
 * the rows are in hand (a pending transaction, or a failed block lookup).
 */
function transactionBlobCount(transaction: BlobTransaction): number {
  return Math.max(transaction.blobs.length, transaction.primary.versioned_hashes?.length ?? 0);
}

function DetailField({
  label,
  title,
  children,
  monospace = false,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
  monospace?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#6e7787] uppercase tracking-wider">{label}</dt>
      <dd className={`mt-1 text-sm text-white truncate ${monospace ? 'font-mono' : ''}`} title={title}>
        {children}
      </dd>
    </div>
  );
}

/**
 * Outbound link to the explorer that indexed this transaction, labelled with
 * the destination host so it reads as leaving BlobFlow.
 */
function ExplorerLink({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded border border-divider px-2.5 py-1 text-sm text-blue transition-colors hover:border-[#3B55E6] hover:text-white"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function TransactionBlobs({ transaction }: { transaction: BlobTransaction }) {
  // Only the blob's identity is stored so anything that replaces the
  // transaction (reorg, network switch, navigating to another transaction
  // without unmounting) closes the viewer instead of serving bytes from the
  // abandoned row. The hash is part of that identity because blob indexes
  // repeat across transactions.
  const [rawBlobKey, setRawBlobKey] = useState<{ txHash: string; blobIndex: number } | null>(null);
  const rawBlob =
    rawBlobKey === null || rawBlobKey.txHash !== transaction.txHash
      ? null
      : (transaction.blobs.find((blob) => blob.blob_index === rawBlobKey.blobIndex) ?? null);
  const archiveAvailable = useRawBlobAvailability(transaction.primary.network_name ?? '');
  // The transaction's own hash list covers blobs whose rows are not in hand
  // (a pending transaction returns one row for all of them). They have no
  // index or raw bytes to offer yet, but the hashes are worth showing rather
  // than hiding blobs the response already named.
  const loadedHashes = new Set(
    transaction.blobs
      .map((blob) => blob.versioned_hash?.toLowerCase())
      .filter((hash): hash is string => Boolean(hash))
  );
  const unloadedHashes = (transaction.primary.versioned_hashes ?? []).filter(
    (hash) => !loadedHashes.has(hash.toLowerCase())
  );

  return (
    <>
      <div className="divide-y divide-divider/80 rounded-lg border border-divider bg-[#0f1322] px-4 sm:px-6">
        {transaction.blobs.map((blob) => (
          <div
            key={blob.blob_index}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-sm text-white">Blob #{blob.blob_index}</span>
              {archiveAvailable && canViewRawBlob(blob) && (
                <RawBlobActions
                  blob={blob}
                  onViewRaw={() =>
                    setRawBlobKey({ txHash: transaction.txHash, blobIndex: blob.blob_index })
                  }
                />
              )}
            </div>
            {blob.versioned_hash && (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="truncate font-mono text-xs text-[#8a93a5]"
                  title={blob.versioned_hash}
                >
                  {truncateTxHash(blob.versioned_hash)}
                </span>
                <CopyButton
                  compact
                  value={blob.versioned_hash}
                  label={`blob #${blob.blob_index} versioned hash`}
                />
              </div>
            )}
          </div>
        ))}

        {unloadedHashes.map((hash) => (
          <div
            key={hash}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-[#6e7787]">Blob not indexed yet</span>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs text-[#8a93a5]" title={hash}>
                {truncateTxHash(hash)}
              </span>
              <CopyButton compact value={hash} label={`versioned hash ${hash}`} />
            </div>
          </div>
        ))}
      </div>

      <RawBlobViewer blob={rawBlob} onClose={() => setRawBlobKey(null)} />
    </>
  );
}

function TransactionSummary({ transaction }: { transaction: BlobTransaction }) {
  const blob = transaction.primary;
  const attribution = blob.user_attribution || 'Unknown';
  const loadedCount = transaction.blobs.length;
  const blobCount = transactionBlobCount(transaction);
  // Fees are a per-gas rate shared by the transaction's blobs; costs and
  // sizes belong to each blob, so they are summed over the rows in hand.
  const realizedCost = formatBlobWeiCost(
    sumCostWei(
      transaction.blobs.map((row) => row.realized_cost_wei || row.total_cost_wei || row.total_cost_eth)
    )
  );
  const maxCost = formatBlobWeiCost(sumCostWei(transaction.blobs.map((row) => row.max_cost_wei)));
  const totalSizeBytes = transaction.blobs.reduce(
    (total, row) => total + (row.blob_size_bytes ?? 0),
    0
  );
  // Sizes and costs only add up to the transaction's when every blob is in
  // hand, so an incomplete set is labelled instead of read as a total.
  const blobsValue = transaction.blobsComplete
    ? formatBlobCount(blobCount)
    : blobCount > loadedCount
      ? `${loadedCount} of ${formatBlobCount(blobCount)}`
      : `${formatBlobCount(loadedCount)} loaded`;
  const fromAddressUrl = safeExplorerUrl(blob.from_address_url);
  const fromExplorerHost = explorerHostLabel(blob.from_address_url);
  const slot = beaconSlotForBlob(blob);

  return (
    <>
      {!transaction.blobsComplete && (
        <p className="mb-4 rounded-lg border border-divider bg-[#14161a] px-4 py-3 text-sm text-bodyText">
          {blobCount > loadedCount
            ? `Only ${loadedCount} of this transaction's ${blobCount} blobs could be loaded, so the size and cost below cover those.`
            : 'Not every blob in this transaction could be loaded, so the size and cost below cover the ones listed.'}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Status" value={transaction.confirmed ? 'Confirmed' : 'Pending'} />
        <StatCard
          label="Block"
          value={
            transaction.blockNumber !== null ? (
              <Link href={`/block/${transaction.blockNumber}`} className="text-blue hover:underline">
                {transaction.blockNumber.toLocaleString()}
              </Link>
            ) : (
              'Not yet included'
            )
          }
        />
        <StatCard label="Blobs" value={blobsValue} />
        <StatCard label="Cost" value={realizedCost} title={realizedCost} />
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4 rounded-lg border border-divider bg-gradient-to-r from-[#17181b] to-[#141519]/60 px-4 sm:px-6 py-4 mb-8">
        <div className="min-w-0 col-span-2">
          <dt className="text-[11px] font-medium text-[#6e7787] uppercase tracking-wider">From</dt>
          <dd className="mt-1 flex items-center gap-2 min-w-0">
            <AttributionBadge user={attribution} sizeClass="w-5 h-5" textClass="text-[10px]" px={20} />
            <Link
              href={`/user/${encodeURIComponent(blob.from_address)}`}
              className="truncate font-mono text-sm text-blue hover:underline"
              title={blob.from_address}
            >
              {truncateAddress(blob.from_address)}
            </Link>
            <span className="truncate text-sm text-[#8a93a5]">{attribution}</span>
            {fromAddressUrl && fromExplorerHost && (
              <a
                href={fromAddressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[#8a93a5] transition-colors hover:text-blue"
                aria-label={`View sender on ${fromExplorerHost}`}
                title={`View sender on ${fromExplorerHost}`}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </dd>
        </div>
        <DetailField label="Time" title={formatLocalTimestamp(blob.timestamp)}>
          <RelativeTime timestamp={blob.timestamp} />
        </DetailField>
        <DetailField label="Size">{formatBlobSize(totalSizeBytes)}</DetailField>
        <DetailField label="Base Fee">
          {formatBlobFee(blob.base_fee_per_blob_gas_gwei, blob.base_fee_per_blob_gas)}
        </DetailField>
        <DetailField label="Tip">
          {formatBlobFee(blob.tip_per_blob_gas_gwei, blob.tip_per_blob_gas)}
        </DetailField>
        <DetailField label="Max Fee">
          {formatBlobFee(blob.max_fee_per_blob_gas_gwei, blob.max_fee_per_blob_gas)}
        </DetailField>
        <DetailField label="Max Cost" title={maxCost}>
          {maxCost}
        </DetailField>
        <DetailField label="Headroom" title={FEE_HEADROOM_TOOLTIP}>
          {formatFeeHeadroom(blob.fee_cap_headroom_percent)}
        </DetailField>
        <DetailField label="Slot">{slot !== null ? slot.toLocaleString() : '-'}</DetailField>
      </dl>
    </>
  );
}

export default function TransactionDetailPage() {
  const params = useParams();
  const rawHash = (params.hash as string) ?? '';
  const isValidHash = TX_HASH_PATTERN.test(rawHash);
  const txHash = rawHash.toLowerCase();
  // The network is part of the route, so this page is already the network's
  // own URL: shareable as-is, with no reader-side state to disagree with it.
  const { selectedNetwork: network } = useNetwork();

  const { data: transaction, isLoading, error } = useApiData<BlobTransaction | null>(
    () =>
      isValidHash
        ? api.getBlobTransaction(txHash, network.apiParam)
        : Promise.resolve(null),
    ['blob-transaction', network.apiParam, txHash],
    {
      // A confirmed transaction with all of its blobs is settled, so it is
      // fetched once. Anything else is still moving (pending, not indexed yet,
      // or missing rows after a failed block lookup): poll a block at a time
      // so the page catches up instead of going stale. A malformed hash never
      // resolves to anything, so it is left alone.
      refetchInterval: (query) => {
        const settled = query.state.data?.confirmed && query.state.data.blobsComplete;
        return !isValidHash || settled ? false : SECONDS_PER_BLOCK * 1000;
      },
    }
  );

  // The indexed row carries its own explorer link; a hash with no row falls
  // back to the network's explorer so the page is never a dead end.
  const explorerUrl =
    safeExplorerUrl(transaction?.primary.transaction_url) ??
    (isValidHash ? explorerTxUrl(txHash, network.apiParam) : null);
  const explorerHost = explorerHostLabel(explorerUrl ?? undefined);

  const loadingComponent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4"
          >
            <div className="h-3 bg-[#26282e] rounded w-20 animate-pulse mb-2" />
            <div className="h-6 bg-[#26282e] rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border border-divider rounded-lg p-6">
        <div className="h-5 bg-[#26282e] rounded w-40 animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-[#26282e] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Link href="/" className="text-blue hover:underline text-sm mb-6 inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-windsor-bold text-white">Blob Transaction</h1>
        <div className="mt-2 flex items-center gap-2">
          <p className="font-mono text-sm text-bodyText break-all">
            {isValidHash ? txHash : rawHash}
          </p>
          {isValidHash && <CopyButton compact value={txHash} label="transaction hash" />}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isValidHash && (
            <CopyButton
              // The address bar already names the network, so the page's own
              // URL is the shareable one; read at click time because the host
              // being browsed is not always the canonical one.
              value={() => `${window.location.origin}${window.location.pathname}`}
              label="link to this transaction"
              text="Copy link"
            />
          )}
          {explorerUrl && explorerHost && (
            <ExplorerLink url={explorerUrl}>View on {explorerHost}</ExplorerLink>
          )}
        </div>
      </div>

      {!isValidHash ? (
        <div className="rounded-lg border border-divider bg-[#14161a] p-6">
          <h2 className="text-xl font-windsor-bold text-white mb-2">Invalid transaction hash</h2>
          <p className="text-bodyText text-sm">
            A transaction hash is 32 bytes, written as 0x followed by 64 hex characters.
          </p>
        </div>
      ) : (
        <DataStateWrapper isLoading={isLoading} error={error} loadingComponent={loadingComponent}>
          {transaction === null ? (
            <div className="rounded-lg border border-divider bg-[#14161a] p-6">
              <h2 className="text-xl font-windsor-bold text-white mb-2">Not indexed</h2>
              <p className="text-bodyText text-sm">
                No blob transaction with this hash is indexed for {network.name}. It may carry no
                blobs, still be pending, or sit outside the indexed window.
              </p>
            </div>
          ) : transaction ? (
            <>
              <TransactionSummary transaction={transaction} />

              <section>
                <h2 className="text-2xl font-windsor-bold text-white mb-4">
                  Blobs in this transaction
                </h2>
                <TransactionBlobs transaction={transaction} />
              </section>
            </>
          ) : null}
        </DataStateWrapper>
      )}
    </div>
  );
}
