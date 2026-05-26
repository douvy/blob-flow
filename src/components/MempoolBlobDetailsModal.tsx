"use client";

import Image from 'next/image';
import React, { useEffect, useRef } from 'react';
import useScrollLock from '../hooks/useScrollLock';
import { MempoolTransaction } from '../types';
import {
  formatCostEthOrWei,
  formatWeiToReadable,
  getAttributionImageSrc,
  getAttributionInitial,
} from '../utils';
import { RelativeTime } from './RelativeTime';

interface MempoolBlobDetailsModalProps {
  transaction: MempoolTransaction | null;
  onClose: () => void;
}

export default function MempoolBlobDetailsModal({
  transaction,
  onClose,
}: MempoolBlobDetailsModalProps) {
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

  const blob = transaction.rawBlob;
  const user = blob.user_attribution || 'Unknown';
  const imageSrc = getAttributionImageSrc(user);
  const blockValue =
    blob.confirmed && blob.block_number > 0 ? blob.block_number.toLocaleString() : 'Pending';

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
        aria-labelledby="mempool-blob-details-title"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-divider bg-[#14161a] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider bg-gradient-to-b from-[#22252c] to-[#16171b] px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#6e7787]">
              Pending Blob
            </p>
            <h3 id="mempool-blob-details-title" className="truncate font-mono text-base text-white">
              {truncateTxHash(transaction.txHash)}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close blob details"
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
              {blob.network_name || `Network ${blob.network_id}`}
            </span>
            <span className="text-sm text-[#6e7687]"><RelativeTime timestamp={transaction.timeInMempool} /></span>
          </div>

          <div className="mb-6 flex items-center gap-3 border-b border-divider pb-5">
            {imageSrc ? (
              <Image src={imageSrc} alt="" width={32} height={32} className="h-8 w-8" />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-500 text-sm font-medium text-white">
                {getAttributionInitial(user)}
              </span>
            )}
            <div>
              <div className="text-xs uppercase tracking-wider text-[#6e7787]">User</div>
              <div className="text-sm font-medium text-white">{user}</div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Transaction Hash" value={transaction.txHash} mono full />
            <DetailItem label="From Address" value={blob.from_address} mono full />
            <DetailItem label="Block" value={blockValue} />
            <DetailItem label="Blob Index" value={blob.blob_index.toString()} />
            <DetailItem label="Blob Size" value={formatBlobSize(blob.blob_size_bytes)} />
            <DetailItem label="Blob Gas Used" value={formatNumber(blob.blob_gas_used)} />
            <DetailItem label="Base Fee" value={safeFormatWei(blob.base_fee_per_blob_gas)} />
            <DetailItem label="Tip" value={safeFormatWei(blob.tip_per_blob_gas)} />
            <DetailItem label="Max Fee" value={safeFormatWei(blob.max_fee_per_blob_gas)} />
            <DetailItem label="Estimated Cost" value={safeFormatCost(blob.total_cost_wei || blob.total_cost_eth)} />
            <DetailItem label="First Seen" value={formatTimestamp(blob.timestamp)} full />
          </dl>
        </div>
      </section>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}

function DetailItem({ label, value, mono = false, full = false }: DetailItemProps) {
  const valueClasses = `${mono ? 'font-mono ' : ''}break-words text-sm text-white`;

  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="mb-1 text-xs uppercase tracking-wider text-[#6e7787]">{label}</dt>
      <dd className={valueClasses}>{value}</dd>
    </div>
  );
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`;
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? '-' : value.toLocaleString();
}

function formatBlobSize(value: number): string {
  if (value <= 0) return '-';
  return `${(value / 1024).toFixed(1)} KB`;
}

function safeFormatWei(value: string | undefined): string {
  if (!value) return '-';

  try {
    return formatWeiToReadable(value);
  } catch {
    return value;
  }
}

function safeFormatCost(value: string | undefined): string {
  if (!value) return '-';

  try {
    return formatCostEthOrWei(value);
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
