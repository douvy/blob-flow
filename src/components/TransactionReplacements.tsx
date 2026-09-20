"use client";

import React from 'react';
import Link from '@/components/NetworkLink';
import { RelativeTime } from '@/components/RelativeTime';
import { useApiData } from '@/hooks/useApiData';
import { useNetwork } from '@/hooks/useNetwork';
import { api } from '@/lib/api';
import { formatSignedGweiDelta, formatTimeToInclusion } from '@/lib/builders';
import type { BlobReplacementResponse } from '@/types';
import { formatBlobFee, truncateTxHash } from '@/utils';

const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/i;

/** How long the replaced transaction sat pending before it was superseded. */
function pendingFor(event: BlobReplacementResponse): string | null {
  if (!event.replaced_first_seen_at) return null;

  const replacedAt = Date.parse(event.replaced_at);
  const firstSeenAt = Date.parse(event.replaced_first_seen_at);
  if (!Number.isFinite(replacedAt) || !Number.isFinite(firstSeenAt)) return null;

  return formatTimeToInclusion(replacedAt - firstSeenAt);
}

/** A fee cap before and after the bump, with the change between them. */
function FeeDelta({
  label,
  fromGwei,
  toGwei,
}: {
  label: string;
  fromGwei?: string;
  toGwei?: string;
}) {
  const delta = formatSignedGweiDelta(fromGwei, toGwei);
  const toneClass = delta?.startsWith('-') ? 'text-[#ff8f8f]' : 'text-green-300';

  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#6e7787] uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm text-white">
        <span className="whitespace-nowrap">
          {formatBlobFee(fromGwei)} &rarr; {formatBlobFee(toGwei)}
        </span>
        {delta && <span className={`ml-2 whitespace-nowrap ${toneClass}`}>{delta}</span>}
      </dd>
    </div>
  );
}

function ReplacementRow({
  event,
  txHash,
}: {
  event: BlobReplacementResponse;
  txHash: string;
}) {
  // One event names both sides of a bump; which one this page is decides
  // whether the other hash is what replaced it or what it replaced.
  const wasReplaced = event.replaced_tx_hash.toLowerCase() === txHash;
  const otherHash = wasReplaced ? event.replacement_tx_hash : event.replaced_tx_hash;
  const pending = pendingFor(event);

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="min-w-0 text-sm text-white">
          <span className="text-[#8a93a5]">{wasReplaced ? 'Replaced by' : 'Replaced'}</span>{' '}
          <Link
            href={`/tx/${otherHash}`}
            className="font-mono text-blue hover:underline"
            title={otherHash}
          >
            {truncateTxHash(otherHash)}
          </Link>
        </p>
        <p className="text-xs text-[#8a93a5] whitespace-nowrap">
          <RelativeTime timestamp={event.replaced_at} />
          {pending && <span> (pending for {pending})</span>}
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
        <FeeDelta
          label="Exec tip"
          fromGwei={event.replaced_max_priority_fee_per_gas_gwei}
          toGwei={event.replacement_max_priority_fee_per_gas_gwei}
        />
        <FeeDelta
          label="Blob fee cap"
          fromGwei={event.replaced_max_fee_per_blob_gas_gwei}
          toGwei={event.replacement_max_fee_per_blob_gas_gwei}
        />
      </dl>
    </div>
  );
}

/**
 * Fee bumps our node saw around this transaction: a pending blob transaction
 * superseded by another from the same sender at the same nonce, in either
 * direction. Supplementary, so it renders nothing at all when there is
 * nothing to show or the fetch fails, rather than putting an empty state or
 * an error on every transaction page.
 */
export default function TransactionReplacements({ txHash }: { txHash: string }) {
  const { selectedNetwork } = useNetwork();
  const isValidHash = TX_HASH_PATTERN.test(txHash);
  const normalizedHash = txHash.toLowerCase();

  const { data, isLoading, error } = useApiData<BlobReplacementResponse[]>(
    () =>
      isValidHash
        ? api.getBlobReplacements(normalizedHash, selectedNetwork.apiParam)
        : Promise.resolve([]),
    ['blob-replacements', selectedNetwork.apiParam, normalizedHash],
    { enabled: isValidHash }
  );

  const events = Array.isArray(data) ? data : [];
  if (error || isLoading || events.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Fee-bump replacements</h2>
      <div className="divide-y divide-divider rounded-lg border border-divider bg-[#0f1322]">
        {events.map((event) => (
          <ReplacementRow
            key={`${event.replaced_tx_hash}-${event.replacement_tx_hash}`}
            event={event}
            txHash={normalizedHash}
          />
        ))}
      </div>
    </section>
  );
}
