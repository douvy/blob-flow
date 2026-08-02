"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Download, ExternalLink } from 'lucide-react';
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
 * The raw-archive action cluster for one blob: View raw and Download once the
 * archive has the bytes, or an Archive pending badge while it catches up.
 * Probes the archive once (HEAD) and rechecks periodically until the blob
 * lands; the viewer and download only appear when they can actually serve
 * bytes. Renders nothing when the blob is definitively absent or until a
 * first answer arrives; failed probes are rechecked on the same cadence and
 * keep the last answer meanwhile, so a pending badge stays up through a
 * failed recheck.
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

  const { data: availability } = useQuery<RawBlobAvailability>({
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
    // hide the actions until remount. Keep rechecking failed probes on the
    // pending cadence so the actions appear once the probe recovers.
    refetchInterval: (query) =>
      query.state.data === 'pending' || query.state.status === 'error'
        ? PENDING_RECHECK_MS
        : false,
  });

  if (
    slot === null ||
    !versionedHash ||
    availability === undefined ||
    availability === 'missing' ||
    availability === 'error'
  ) {
    return null;
  }

  return (
    <span className="flex items-center gap-2 border-l border-divider pl-3 text-xs">
      {availability === 'available' ? (
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
      ) : (
        <span
          className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-[#E6B23B]/40 bg-[#2b2416] px-2 py-0.5 text-[#e8c268]"
          title="The raw bytes for this blob have not reached the archive yet. New blobs typically appear within one to two minutes."
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          Archive pending
        </span>
      )}
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
