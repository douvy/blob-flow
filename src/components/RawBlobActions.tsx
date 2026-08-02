"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Download, ExternalLink, TriangleAlert } from 'lucide-react';
import { BlobResponse } from '../types';
import {
  checkRawBlobAvailability,
  rawBlobDownloadUrl,
  RawBlobAvailability,
} from '../lib/api/rawBlob';
import { beaconSlotForBlob } from '../utils';
import { BLOAR_REPO_URL } from '../constants';

/** How often a pending blob rechecks the archive; matches its sync cadence. */
export const PENDING_RECHECK_MS = 15000;

/**
 * A blob still pending after this long is reported as delayed rather than
 * pending, since a healthy archive stores new blobs within a couple of
 * minutes; past this point the wait is an archive stall, not sync lag.
 */
export const ARCHIVE_DELAYED_AFTER_MS = 5 * 60 * 1000;

const PENDING_TITLE =
  'The raw bytes for this blob have not reached the archive yet. New blobs typically appear within one to two minutes.';
const DELAYED_TITLE =
  'The archive is running behind and has not stored this blob yet. It becomes viewable once the archive catches up.';
const UNREACHABLE_TITLE =
  'The blob archive could not be reached to check for this blob. Checking again periodically.';
const NOT_ARCHIVED_TITLE =
  'This blob is not present in the archive. The slot may predate the archive or the hash is absent.';

/**
 * The raw-archive action cluster for one blob: View raw and Download once the
 * archive has the bytes, and an explicit status otherwise (Archive pending,
 * Archive delayed, Archive unreachable, or Not archived), so a stalled or
 * unreachable archive stays visible instead of the feature silently
 * vanishing. Probes the archive once (HEAD) and rechecks pending and failed
 * probes periodically; a failed recheck keeps the last answer, so a pending
 * badge stays up through a transient outage. Renders nothing only while the
 * first probe is in flight or when the blob cannot be addressed at all.
 */
export default function RawBlobActions({
  blob,
  onViewRaw,
}: {
  blob: BlobResponse;
  onViewRaw: () => void;
}) {
  const slot = beaconSlotForBlob(blob);
  const versionedHash = blob.versioned_hash;

  const { data: availability, errorUpdatedAt, fetchStatus, dataUpdatedAt } = useQuery<RawBlobAvailability>({
    queryKey: ['raw-blob-availability', blob.network_name, slot, versionedHash],
    queryFn: async () => {
      const probed = await checkRawBlobAvailability(
        slot as number,
        versionedHash as string,
        blob.network_name
      );
      // Probe failures throw so a transient outage is not cached as an
      // answer; 'missing' is a definitive answer.
      if (probed === 'error') {
        throw new Error('Raw blob availability probe failed.');
      }
      return probed;
    },
    enabled: slot !== null && Boolean(versionedHash),
    staleTime: Infinity,
    // The app-wide default is retry: false, so a failed probe would otherwise
    // stay unresolved until remount. Keep rechecking pending and failed
    // probes on the same cadence so the actions appear once the blob lands
    // or the probe recovers.
    refetchInterval: (query) =>
      query.state.data === 'pending' || query.state.status === 'error'
        ? PENDING_RECHECK_MS
        : false,
  });

  // An unanswered probe that has ever failed, or that cannot run because the
  // browser is offline, surfaces as an unreachable badge; after a success,
  // react-query keeps the last answer through failed rechecks. errorUpdatedAt
  // rather than isError keeps the badge up while a retry is in flight, since
  // a no-data refetch resets the query status to pending.
  const probeFailed =
    availability === undefined && (errorUpdatedAt > 0 || fetchStatus === 'paused');

  if (slot === null || !versionedHash || (availability === undefined && !probeFailed)) {
    return null;
  }

  let status: React.ReactNode;
  if (availability === 'available') {
    status = (
      <>
        <button
          type="button"
          onClick={onViewRaw}
          className="rounded border border-divider px-2 py-0.5 text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
        >
          View raw
        </button>
        <a
          href={rawBlobDownloadUrl(slot, versionedHash, blob.network_name)}
          download={`blob-${versionedHash}.bin`}
          className="inline-flex items-center gap-1 rounded border border-divider px-2 py-0.5 text-[#b8bdc7] transition-colors hover:border-[#3B55E6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3B55E6]"
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          Download
        </a>
      </>
    );
  } else if (availability === 'pending') {
    // The blob's age as of the last probe answer; dataUpdatedAt advances
    // with every recheck, so a blob left pending eventually reads delayed.
    // A query-state timestamp keeps render pure (no Date.now() here). The
    // comparison assumes the client clock is roughly right; the generous
    // threshold absorbs realistic skew against the chain timestamp.
    const parsedMs = Date.parse(blob.timestamp);
    const delayed = !Number.isNaN(parsedMs) && dataUpdatedAt - parsedMs >= ARCHIVE_DELAYED_AFTER_MS;
    status = (
      <span
        role="status"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-[#E6B23B]/40 bg-[#2b2416] px-2 py-0.5 text-[#e8c268]"
        title={delayed ? DELAYED_TITLE : PENDING_TITLE}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        {delayed ? 'Archive delayed' : 'Archive pending'}
      </span>
    );
  } else if (availability === 'missing') {
    status = (
      <span role="status" className="whitespace-nowrap text-[#6e7787]" title={NOT_ARCHIVED_TITLE}>
        Not archived
      </span>
    );
  } else {
    status = (
      <span
        role="status"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-red-400/40 bg-[#2b1616] px-2 py-0.5 text-red-300"
        title={UNREACHABLE_TITLE}
      >
        <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        Archive unreachable
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 border-l border-divider pl-3 text-xs">
      {status}
      <span className="text-[#6e7787]">
        provided by{' '}
        <a
          href={BLOAR_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-baseline gap-0.5 text-blue hover:underline"
        >
          bloar
          <ExternalLink className="h-2.5 w-2.5 self-center" aria-hidden="true" />
        </a>
      </span>
    </span>
  );
}
