"use client";

import { ArrowRight } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import useScrollLock from '../hooks/useScrollLock';
import {
  isPartiallySampled,
  withLowerBound,
  type PendingMempoolTransaction,
} from '../lib/mempoolTransactions';
import {
  formatBlobCount,
  formatBlobSize,
  formatWeiToReadable,
  safeExplorerUrl,
} from '../utils';
import { PRIORITY_FEE_TOOLTIP } from '@/constants';
import { RelativeTime } from './RelativeTime';
import AttributionBadge from './AttributionBadge';
import NetworkLink from './NetworkLink';

interface MempoolTransactionDetailsModalProps {
  transaction: PendingMempoolTransaction | null;
  onClose: () => void;
}

export default function MempoolTransactionDetailsModal({
  transaction,
  onClose,
}: MempoolTransactionDetailsModalProps) {
  const isOpen = transaction !== null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!transaction) return null;

  const blob = transaction.entries[0].rawBlob;
  const user = transaction.user || 'Unknown';
  const fromAddressUrl = safeExplorerUrl(transaction.fromAddressUrl);
  const blockValue =
    blob.confirmed && blob.block_number !== null && blob.block_number > 0
      ? blob.block_number.toLocaleString()
      : 'Pending';
  // Everything summed below covers the entries in hand, so a transaction the
  // sample cut in half gets lower bounds rather than totals presented as final.
  const partialSample = isPartiallySampled(transaction);
  const partialNote = partialSample
    ? `This sample holds ${transaction.sampledBlobCount} of the transaction's ${transaction.blobCount} blobs, so the size, gas and cost below cover those.`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 backdrop-blur-[1px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mempool-transaction-details-title"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-divider bg-[#14161a] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b] px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6e7787]">
              Pending Transaction
            </p>
            <h3
              id="mempool-transaction-details-title"
              className="truncate font-mono text-base text-white"
            >
              {truncateTxHash(transaction.txHash)}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-divider text-xl leading-none text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
          >
            x
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto px-5 py-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[#3B55E6]/40 bg-[#1E2747] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#9ac4fd]">
              {blob.confirmed ? 'Confirmed' : 'Pending'}
            </span>
            <span className="text-sm text-[#b8bdc7]">
              {blob.network_name || 'Unknown network'}
            </span>
            <span className="text-sm text-[#6e7687]"><RelativeTime timestamp={transaction.timeInMempool} /></span>
            {/* The transaction page carries the explorer link, correctly
                labelled for whichever explorer the indexer points at. */}
            <NetworkLink
              href={`/tx/${transaction.txHash}`}
              className="ml-auto inline-flex items-center gap-2 text-sm text-blue hover:underline"
            >
              Open transaction page
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </NetworkLink>
          </div>

          <div className="mb-6 flex items-center gap-3 border-b border-divider pb-5">
            <AttributionBadge user={user} sizeClass="h-8 w-8" textClass="text-sm" px={32} />
            <div>
              <div className="text-xs uppercase tracking-wider text-[#6e7787]">User</div>
              <div className="text-sm font-medium text-white">{user}</div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailItem
              label="Transaction Hash"
              value={transaction.txHash}
              internalHref={`/tx/${transaction.txHash}`}
              mono
              full
            />
            <DetailItem
              label="From Address"
              value={transaction.fromAddressFull}
              href={fromAddressUrl}
              mono
              full
            />
            <DetailItem label="Block" value={blockValue} />
            <DetailItem label="Blobs" value={formatBlobCount(transaction.blobCount)} />
            <DetailItem
              label="Blob Size"
              value={withLowerBound(formatBlobSize(transaction.blobSizeBytes), partialSample)}
              title={partialNote}
            />
            <DetailItem
              label="Blob Gas Used"
              value={withLowerBound(formatGasUsed(transaction), partialSample)}
              title={partialNote}
            />
            <DetailItem label="Base Fee" value={safeFormatWei(blob.base_fee_per_blob_gas)} />
            <DetailItem
              label="Max Exec Tip"
              value={blob.max_priority_fee_per_gas ? safeFormatWei(blob.max_priority_fee_per_gas) : '-'}
              title={PRIORITY_FEE_TOOLTIP}
            />
            <DetailItem label="Max Fee" value={safeFormatWei(blob.max_fee_per_blob_gas)} />
            <DetailItem
              label="Estimated Cost"
              value={withLowerBound(transaction.realizedCost, partialSample)}
              title={partialNote}
            />
            <DetailItem
              label="Max Cost"
              value={withLowerBound(transaction.maxCost, partialSample)}
              title={partialNote}
            />
            <DetailItem label="First Seen" value={formatTimestamp(transaction.timeInMempool)} full />
          </dl>

          {partialNote && (
            <p className="mt-5 border-t border-divider pt-4 text-xs leading-relaxed text-[#8a93a5]">
              {partialNote}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
  /** Outbound link, opened in a new tab. */
  href?: string;
  /** In-app destination, taking precedence over href. */
  internalHref?: string;
  /** Hover text for values that need a caveat, such as a partial total. */
  title?: string;
  mono?: boolean;
  full?: boolean;
}

function DetailItem({
  label,
  value,
  href,
  internalHref,
  title,
  mono = false,
  full = false,
}: DetailItemProps) {
  const valueClasses = `${mono ? 'font-mono ' : ''}break-words text-sm text-white`;

  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="mb-1 text-xs uppercase tracking-wider text-[#6e7787]">{label}</dt>
      <dd className={valueClasses} title={title}>
        {internalHref ? (
          <NetworkLink href={internalHref} className="text-blue hover:underline">
            {value}
          </NetworkLink>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`;
}

/**
 * Blob gas across the transaction's entries. One entry without the field
 * voids the total, since a partial sum would read as the whole transaction's.
 */
function formatGasUsed(transaction: PendingMempoolTransaction): string {
  const total = transaction.entries.reduce<number | undefined>((sum, entry) => {
    const gas = entry.rawBlob.blob_gas_used;
    if (sum === undefined || gas === undefined) return undefined;
    return sum + gas;
  }, 0);

  return total === undefined ? '-' : total.toLocaleString();
}

function safeFormatWei(value: string | undefined): string {
  if (!value) return '-';

  try {
    return formatWeiToReadable(value);
  } catch {
    return value;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}
